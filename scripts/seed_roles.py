#!/usr/bin/env python3
"""
ResearchOrg Roles Seeder v1.0
================================
Scrapes company job roles with tools, skills, processes, interview questions,
and keywords. Links each role to an existing department via Supabase lookup.

Source hierarchy — tried in order, merged and deduplicated:
  Tier 1  Indeed job search       Current/recent job titles for the company (HTML)
  Tier 2  Company /careers page   Static HTML job listings with role titles
  Tier 3  LinkedIn public jobs    Public job search results (may be rate-limited)
  Tier 4  Glassdoor public jobs   Company jobs page (public HTML, limited)
  Tier 5  Yahoo search            "{company} jobs careers [department]"
  Tier 6  Curated role templates  Role metadata (tools, skills, IQ, keywords) by dept
  Tier 7  Synthetic fallback      Always returns 2–3 roles per scraped department

Role metadata strategy:
  • Scrapers collect ROLE TITLES (most reliable and consistent across runs)
  • Tools, skills, processes, interview_questions, and keywords come from
    a curated template library keyed by role title patterns
  • This gives stable, high-quality metadata that doesn't drift with each posting

Consistency guarantee:
  • Role titles from live sources are normalised before dedup (case, punctuation)
  • Template library is deterministic — same role → same tools/skills every time
  • Department linkage uses fuzzy name matching against existing company_departments
  • Synthetic fallback generates 3 roles per department if all scraping fails

Usage:
  python seed_roles.py --company "Tesla" --website "tesla.com"
  python seed_roles.py --company "Zebra Technologies" --website "zebra.com" \\
      --company-id "uuid" --auth-token "jwt" --app-url "http://localhost:3000"

Output: JSON {"count": N, "written": bool}  when --company-id given
        JSON array of roles                 without --company-id (debug mode)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from typing import Optional
from urllib.parse import quote, quote_plus, urlparse

import requests
from bs4 import BeautifulSoup

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("seed_roles")

# ─── HTTP ─────────────────────────────────────────────────────────────────────
DEFAULT_TIMEOUT = 14
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent":      UA,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

class Session:
    def __init__(self, timeout: int = DEFAULT_TIMEOUT):
        self.s = requests.Session()
        self.s.headers.update(HEADERS)
        self.timeout = timeout

    def get(self, url: str, **kw) -> requests.Response:
        kw.setdefault("timeout", self.timeout)
        kw.setdefault("allow_redirects", True)
        try:
            return self.s.get(url, **kw)
        except requests.exceptions.SSLError:
            kw["verify"] = False
            return self.s.get(url, **kw)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()

def truncate(text: str, n: int) -> str:
    return text if len(text) <= n else text[:n - 1].rstrip() + "…"

def base_url(website: str) -> str:
    p = urlparse(website if "://" in website else "https://" + website)
    host = (p.netloc or p.path).lstrip("www.")
    return f"https://{host}"

def fetch_soup(sess: Session, url: str, timeout: int = 12) -> Optional[BeautifulSoup]:
    try:
        r = sess.get(url, timeout=timeout)
        if r.status_code == 200:
            return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.debug("fetch_soup(%s): %s", url, e)
    return None


# ─── Level inference ──────────────────────────────────────────────────────────

LEVEL_RULES: list[tuple[str, str]] = [
    (r"\b(intern|co-op)\b",                                           "L3"),
    (r"\b(junior|associate|entry.level|new.grad)\b",                  "L3"),
    (r"\b(software engineer ii|engineer ii|analyst ii)\b",            "L4"),
    (r"\b(software engineer i|engineer i|analyst i)\b",               "L3"),
    (r"\b(mid.level|engineer iii|analyst iii)\b",                     "L4"),
    (r"\b(senior|sr\.)\b",                                            "L5"),
    (r"\b(staff|principal|lead engineer|tech lead)\b",                "L7 / Staff"),
    (r"\b(distinguished|fellow)\b",                                   "L7 / Staff"),
    (r"\b(manager|engineering manager|team lead)\b",                  "Manager"),
    (r"\b(senior manager|sr\.? manager)\b",                           "Manager"),
    (r"\b(director|group product manager)\b",                         "Director"),
    (r"\b(senior director|sr\.? director)\b",                         "Director"),
    (r"\b(vp|vice president)\b",                                      "VP"),
    (r"\b(svp|senior vice president|evp|executive vice president)\b", "VP"),
    (r"\b(c[a-z]o|chief)\b",                                          "VP"),
]

def infer_level(title: str) -> str:
    tl = title.lower()
    for pattern, level in LEVEL_RULES:
        if re.search(pattern, tl):
            return level
    return "L4"  # default: mid-level individual contributor


# ─── Department inference from job title ─────────────────────────────────────

TITLE_TO_DEPT: list[tuple[str, str]] = [
    (r"\b(software|engineer|developer|backend|frontend|fullstack|full.stack|sre|devops|platform|mobile|embedded|firmware|architect)\b", "Engineering"),
    (r"\b(product manager|product management|product lead|product owner)\b",                                                             "Product"),
    (r"\b(technical program manager|tpm|program manager|program management|project manager|pmo|delivery manager)\b",                    "Program Management"),
    (r"\b(data scientist|data analyst|data engineer|ml engineer|ai engineer|machine learning|analytics engineer|business intelligence)\b","Data & Analytics"),
    (r"\b(designer|ux|ui|user experience|interaction design|visual design|graphic design|brand design|creative)\b",                      "Design"),
    (r"\b(infrastructure|cloud engineer|cloud architect|sre|systems administrator|reliability|network engineer|devops)\b",               "Infrastructure"),
    (r"\b(security engineer|cybersecurity|appsec|pen test|information security|identity|access management)\b",                           "Security"),
    (r"\b(account executive|sales development|sales representative|business development|channel sales|channel manager|channel partner)\b","Sales"),
    (r"\b(account manager|solutions consultant|solutions engineer|enterprise sales)\b",                                                  "Sales"),
    (r"\b(marketing|growth|demand generation|content marketer|seo|performance marketing|brand manager|communications|pr)\b",             "Marketing"),
    (r"\b(customer success|customer support|support engineer|technical support|onboarding|client success)\b",                            "Customer Success"),
    (r"\b(professional services|ps engineer|ps consultant|field engineer|deployment engineer|implementation engineer)\b",                "Professional Services"),
    (r"\b(financial analyst|finance|accounting|controller|fp&a|treasury|tax|payroll|audit)\b",                                           "Finance"),
    (r"\b(legal|counsel|attorney|compliance|privacy|ip|contracts|regulatory)\b",                                                         "Legal"),
    (r"\b(hr|human resources|people|recruiter|talent acquisition|hrbp|compensation|benefits|learning)\b",                                "People & HR"),
    (r"\b(supply chain|logistics|procurement|quality assurance|warehouse|facilities|operations analyst)\b",                              "Operations"),
    (r"\b(manufacturing engineer|production engineer|process engineer|industrial engineer|assembly|fabrication|lean)\b",                 "Manufacturing"),
    (r"\b(research scientist|research engineer|scientist|lab|r&d|innovation|applied science)\b",                                         "Research"),
    (r"\b(it|helpdesk|systems administrator|enterprise technology|endpoint|erp|crm admin)\b",                                            "IT"),
    (r"\b(operations manager|operations director|vp operations|head of operations)\b",                                                   "Operations"),
]

def infer_dept_name(title: str) -> str:
    tl = title.lower()
    for pattern, dept in TITLE_TO_DEPT:
        if re.search(pattern, tl):
            return dept
    # Generic fallbacks for common patterns not caught above
    if re.search(r"\bmanager\b", tl) and re.search(r"\bsales\b|\bchann?el\b|\bterrit\b", tl):
        return "Sales"
    if re.search(r"\banalyst\b", tl):
        return "Data & Analytics"
    if re.search(r"\bmanager\b", tl):
        return "Operations"
    return "Engineering"  # ultimate default


# ─── Curated role template library ───────────────────────────────────────────
# Provides consistent tools, skills, processes, interview_questions, keywords
# keyed by (department_name, level_bucket).
# This is the secret to consistency: live scraping gives us role titles,
# but metadata comes from this deterministic library.

LEVEL_BUCKETS = {
    "L3": "junior", "L4": "mid", "L5": "senior",
    "L7 / Staff": "staff", "Manager": "manager",
    "Director": "director", "VP": "vp",
}

ROLE_TEMPLATES: dict[str, dict[str, dict]] = {
    "Engineering": {
        "junior": {
            "tools":               ["Git", "VS Code", "Jira", "Docker"],
            "skills":              ["Problem solving", "Code review", "Unit testing", "Debugging"],
            "processes":           ["Daily standups", "Sprint planning", "Code reviews", "PR workflow"],
            "interview_questions": [
                "Walk me through how you debug a production issue.",
                "Explain the difference between REST and GraphQL.",
                "How do you approach writing testable code?",
            ],
            "keywords": ["software development", "agile", "version control", "testing", "debugging"],
        },
        "mid": {
            "tools":               ["GitHub", "Docker", "Kubernetes", "Datadog", "AWS"],
            "skills":              ["System design", "API design", "Code review", "Mentorship"],
            "processes":           ["Sprint planning", "On-call rotation", "Design docs", "Incident response"],
            "interview_questions": [
                "Design a URL shortener that handles 100M requests/day.",
                "How do you balance shipping velocity vs. code quality?",
                "Walk me through the most complex system you've built.",
            ],
            "keywords": ["distributed systems", "microservices", "API design", "scalability", "code quality"],
        },
        "senior": {
            "tools":               ["GitHub", "Docker", "Kubernetes", "Terraform", "Datadog", "AWS", "PostgreSQL"],
            "skills":              ["System architecture", "Distributed systems", "Technical mentorship", "Cross-team alignment"],
            "processes":           ["Design review", "RFC process", "On-call rotation", "Sprint retrospectives"],
            "interview_questions": [
                "Walk me through the architecture of a globally distributed system you've designed.",
                "How do you handle technical debt vs. feature work?",
                "Describe a time you improved system reliability at scale.",
            ],
            "keywords": ["senior engineering", "distributed systems", "architecture", "reliability", "technical leadership"],
        },
        "staff": {
            "tools":               ["GitHub", "Terraform", "AWS", "Snowflake", "Buildkite", "PagerDuty"],
            "skills":              ["System architecture", "Cross-org alignment", "Technical strategy", "Org influence"],
            "processes":           ["RFC process", "Architecture review board", "Quarterly roadmap", "Incident command"],
            "interview_questions": [
                "How do you influence engineering direction without direct authority?",
                "Walk me through an architectural decision you regret and what you learned.",
                "How do you measure engineering impact beyond shipping code?",
            ],
            "keywords": ["technical leadership", "system design", "architecture", "cross-functional", "engineering strategy"],
        },
        "manager": {
            "tools":               ["Linear", "Notion", "GitHub", "Lattice", "Datadog"],
            "skills":              ["People management", "Sprint planning", "Performance reviews", "Recruiting"],
            "processes":           ["Weekly 1:1s", "OKR setting", "Bi-annual performance cycles", "Headcount planning"],
            "interview_questions": [
                "How do you handle an underperforming engineer?",
                "Describe a team conflict you resolved.",
                "How do you balance shipping velocity vs. engineering quality?",
            ],
            "keywords": ["people management", "OKRs", "engineering velocity", "headcount", "performance management"],
        },
        "director": {
            "tools":               ["Tableau", "Notion", "GitHub", "Lattice", "Workday"],
            "skills":              ["Org design", "P&L ownership", "Cross-functional leadership", "Technical strategy"],
            "processes":           ["Quarterly planning", "Annual headcount review", "Budget ownership", "Executive reporting"],
            "interview_questions": [
                "How do you build an engineering culture at scale?",
                "Walk me through how you've grown a team through hypergrowth.",
                "How do you align engineering priorities with company strategy?",
            ],
            "keywords": ["engineering leadership", "org design", "strategy", "cross-functional", "culture"],
        },
        "vp": {
            "tools":               ["Tableau", "Workday", "Jira", "Salesforce"],
            "skills":              ["Org strategy", "Executive communication", "P&L ownership", "Board reporting"],
            "processes":           ["Annual planning", "OKR alignment", "Board updates", "M&A technical diligence"],
            "interview_questions": [
                "How do you build and maintain a world-class engineering organization?",
                "What's your philosophy on build vs. buy decisions at scale?",
                "How have you managed through major organizational change?",
            ],
            "keywords": ["VP engineering", "org strategy", "executive leadership", "P&L", "board reporting"],
        },
    },

    "Product": {
        "junior": {
            "tools":               ["Jira", "Figma", "Notion", "Mixpanel"],
            "skills":              ["User research", "Requirements gathering", "Stakeholder communication", "A/B testing"],
            "processes":           ["Daily standups", "Sprint planning", "User interviews", "Roadmap updates"],
            "interview_questions": [
                "Walk me through how you would prioritize a feature backlog.",
                "How do you measure the success of a product feature?",
                "Tell me about a product decision you made with limited data.",
            ],
            "keywords": ["product management", "agile", "roadmap", "user stories", "prioritization"],
        },
        "senior": {
            "tools":               ["Jira", "Figma", "Amplitude", "Notion", "Looker", "Miro"],
            "skills":              ["Product strategy", "Data-driven decision making", "Cross-functional leadership", "Go-to-market"],
            "processes":           ["Quarterly roadmap planning", "OKR setting", "Product reviews", "Launch coordination"],
            "interview_questions": [
                "How do you build a product roadmap that balances user needs vs. business goals?",
                "Describe a time you killed a feature. How did you make that decision?",
                "How do you work with engineers who disagree with your priorities?",
            ],
            "keywords": ["product strategy", "OKRs", "go-to-market", "roadmap", "cross-functional", "metrics"],
        },
        "manager": {
            "tools":               ["Jira", "Figma", "Notion", "Amplitude", "Looker"],
            "skills":              ["Product leadership", "Team building", "Strategic thinking", "Executive communication"],
            "processes":           ["Roadmap reviews", "Team rituals", "OKR alignment", "Stakeholder reporting"],
            "interview_questions": [
                "How do you develop PMs on your team?",
                "Walk me through how you've built a product organisation from scratch.",
                "How do you align product vision with company strategy?",
            ],
            "keywords": ["product leadership", "team management", "strategy", "roadmap", "stakeholder management"],
        },
    },

    "Data & Analytics": {
        "mid": {
            "tools":               ["Python", "SQL", "dbt", "Looker", "Tableau", "Snowflake", "Spark"],
            "skills":              ["Statistical analysis", "Data modelling", "ETL pipelines", "Dashboard design"],
            "processes":           ["Sprint planning", "Data governance", "Model review", "A/B test analysis"],
            "interview_questions": [
                "Walk me through a data pipeline you built end-to-end.",
                "How do you handle data quality issues in production?",
                "Explain the difference between precision and recall.",
            ],
            "keywords": ["data engineering", "analytics", "ETL", "SQL", "Python", "machine learning"],
        },
        "senior": {
            "tools":               ["Python", "SQL", "dbt", "Spark", "Airflow", "Snowflake", "Looker", "Databricks"],
            "skills":              ["ML model deployment", "Data architecture", "Experimentation design", "Stakeholder alignment"],
            "processes":           ["Feature store management", "Model monitoring", "A/B testing framework", "Data governance"],
            "interview_questions": [
                "How do you design an experimentation platform from scratch?",
                "Describe a machine learning model you took from idea to production.",
                "How do you balance data quality vs. delivery speed?",
            ],
            "keywords": ["data science", "machine learning", "MLOps", "experimentation", "feature engineering"],
        },
    },

    "Design": {
        "mid": {
            "tools":               ["Figma", "Sketch", "Principle", "Zeplin", "Adobe XD"],
            "skills":              ["User research", "Prototyping", "Design systems", "Accessibility"],
            "processes":           ["Design critiques", "User testing sessions", "Handoff to engineering", "Design sprints"],
            "interview_questions": [
                "Walk me through your design process from brief to final deliverable.",
                "How do you advocate for user needs when business priorities conflict?",
                "Show me a design decision that didn't work and what you learned.",
            ],
            "keywords": ["UX design", "product design", "design systems", "prototyping", "user research"],
        },
        "senior": {
            "tools":               ["Figma", "Miro", "Principle", "Protopie", "Maze"],
            "skills":              ["Systems thinking", "Design leadership", "Cross-functional partnership", "Design strategy"],
            "processes":           ["Design system governance", "Design reviews", "User research programmes", "Design-to-dev handoff"],
            "interview_questions": [
                "How do you build and maintain a design system for a large product?",
                "Describe your approach to designing for multiple platforms simultaneously.",
                "How do you measure the impact of design decisions?",
            ],
            "keywords": ["design leadership", "design systems", "product design", "UX strategy", "accessibility"],
        },
    },

    "Sales": {
        "junior": {
            "tools":               ["Salesforce", "Outreach", "LinkedIn Sales Navigator", "ZoomInfo", "Gong"],
            "skills":              ["Prospecting", "Cold outreach", "Discovery calls", "Pipeline management"],
            "processes":           ["Daily prospecting cadence", "Weekly pipeline review", "Sales training", "CRM hygiene"],
            "interview_questions": [
                "Tell me about a time you turned a 'no' into a 'yes'.",
                "Walk me through your prospecting methodology.",
                "How do you handle objections in a discovery call?",
            ],
            "keywords": ["SDR", "prospecting", "cold outreach", "pipeline", "quota", "CRM"],
        },
        "senior": {
            "tools":               ["Salesforce", "Gong", "Clari", "LinkedIn Sales Navigator", "DocuSign", "Outreach"],
            "skills":              ["Enterprise selling", "Multi-stakeholder management", "Commercial negotiation", "Solution selling"],
            "processes":           ["MEDDIC qualification", "QBRs", "Executive sponsorship", "Deal desk"],
            "interview_questions": [
                "Walk me through the largest deal you've ever closed.",
                "How do you manage a 12-month enterprise sales cycle?",
                "Describe a time you navigated a complex multi-stakeholder sale.",
            ],
            "keywords": ["enterprise sales", "MEDDIC", "quota attainment", "account executive", "solution selling"],
        },
        "manager": {
            "tools":               ["Salesforce", "Clari", "Gong", "Tableau", "LinkedIn Sales Navigator"],
            "skills":              ["Team coaching", "Forecasting", "Territory planning", "Hiring"],
            "processes":           ["Weekly 1:1s", "Pipeline reviews", "QBRs", "Ramping new reps"],
            "interview_questions": [
                "How do you build a sales culture of accountability and coaching?",
                "Walk me through how you've improved a struggling rep's performance.",
                "How do you forecast accurately in an uncertain pipeline?",
            ],
            "keywords": ["sales management", "forecasting", "pipeline management", "coaching", "quota"],
        },
    },

    "Marketing": {
        "mid": {
            "tools":               ["HubSpot", "Google Analytics", "Marketo", "Salesforce", "Sprout Social"],
            "skills":              ["Campaign management", "Content creation", "SEO/SEM", "Marketing analytics"],
            "processes":           ["Campaign planning", "A/B testing", "Editorial calendar", "Attribution reporting"],
            "interview_questions": [
                "Walk me through a campaign you ran end-to-end.",
                "How do you measure marketing attribution?",
                "Describe your approach to content strategy.",
            ],
            "keywords": ["demand generation", "content marketing", "SEO", "campaigns", "attribution"],
        },
        "senior": {
            "tools":               ["HubSpot", "Marketo", "Tableau", "Salesforce", "Google Analytics 4", "SEMrush"],
            "skills":              ["Go-to-market strategy", "Brand positioning", "Pipeline influence", "Team leadership"],
            "processes":           ["Integrated campaign planning", "ABM programmes", "Brand guidelines", "Partner marketing"],
            "interview_questions": [
                "How do you build a demand generation engine from scratch?",
                "Describe a go-to-market strategy you developed and executed.",
                "How do you align marketing and sales to improve conversion?",
            ],
            "keywords": ["growth marketing", "demand generation", "brand strategy", "GTM", "pipeline influence"],
        },
    },

    "Customer Success": {
        "mid": {
            "tools":               ["Salesforce", "Gainsight", "Zendesk", "Jira", "Slack"],
            "skills":              ["Relationship management", "Onboarding", "Retention", "Product adoption"],
            "processes":           ["Onboarding playbook", "QBRs", "Health score monitoring", "Renewal pipeline"],
            "interview_questions": [
                "Walk me through how you've prevented a churn risk.",
                "How do you drive product adoption with a reluctant customer?",
                "Describe your approach to a customer escalation.",
            ],
            "keywords": ["customer success", "churn prevention", "onboarding", "NPS", "retention", "expansion"],
        },
        "senior": {
            "tools":               ["Salesforce", "Gainsight", "Pendo", "Looker", "Zendesk"],
            "skills":              ["Executive relationship management", "Portfolio strategy", "Escalation management", "Upsell/expansion"],
            "processes":           ["Executive business reviews", "Success planning", "Escalation protocol", "CS playbook design"],
            "interview_questions": [
                "How do you build a customer success organisation that drives expansion revenue?",
                "Describe the most difficult customer escalation you've managed.",
                "How do you measure and improve NPS at scale?",
            ],
            "keywords": ["enterprise customer success", "expansion revenue", "executive sponsors", "NPS", "retention"],
        },
    },

    "Finance": {
        "mid": {
            "tools":               ["Excel", "Workday", "NetSuite", "Tableau", "Anaplan"],
            "skills":              ["Financial modelling", "Budgeting", "Variance analysis", "Reporting"],
            "processes":           ["Monthly close", "Budget review", "Board reporting", "AP/AR processes"],
            "interview_questions": [
                "Walk me through how you build a 3-statement financial model.",
                "How do you identify and investigate budget variances?",
                "Describe your experience with the monthly close process.",
            ],
            "keywords": ["FP&A", "financial modelling", "budgeting", "monthly close", "variance analysis"],
        },
        "senior": {
            "tools":               ["Workday", "Anaplan", "NetSuite", "Tableau", "Excel", "SAP"],
            "skills":              ["Strategic finance", "Scenario planning", "Investor relations", "M&A analysis"],
            "processes":           ["Quarterly board reporting", "Long-range planning", "Fundraise support", "Audit coordination"],
            "interview_questions": [
                "Walk me through a complex financial model you built for a strategic decision.",
                "How do you communicate financial results to a non-financial audience?",
                "Describe your experience supporting a fundraising process.",
            ],
            "keywords": ["strategic finance", "FP&A", "investor relations", "scenario planning", "M&A"],
        },
    },

    "People & HR": {
        "mid": {
            "tools":               ["Workday", "Greenhouse", "Lattice", "Culture Amp", "LinkedIn Recruiter"],
            "skills":              ["Talent acquisition", "Performance management", "HR policies", "Onboarding"],
            "processes":           ["Hiring pipeline management", "Performance review cycles", "Onboarding programme", "Benefits administration"],
            "interview_questions": [
                "How do you source and close top-tier candidates in a competitive market?",
                "Walk me through how you've run a performance review cycle.",
                "How do you handle an employee relations issue?",
            ],
            "keywords": ["recruiting", "talent acquisition", "HRBP", "performance management", "onboarding", "culture"],
        },
        "senior": {
            "tools":               ["Workday", "Greenhouse", "Lattice", "Culture Amp", "Pave", "Carta"],
            "skills":              ["HRBP partnership", "Compensation design", "Org design", "Culture building"],
            "processes":           ["Talent reviews", "Comp benchmarking", "HR strategy", "DE&I programme"],
            "interview_questions": [
                "How do you partner with engineering leadership to solve people challenges?",
                "Describe how you've redesigned a compensation structure.",
                "Walk me through your approach to building an inclusive culture.",
            ],
            "keywords": ["HRBP", "org design", "compensation", "DE&I", "talent management", "culture"],
        },
    },

    "Operations": {
        "mid": {
            "tools":               ["SAP", "Jira", "Tableau", "Excel", "Asana"],
            "skills":              ["Process optimisation", "Project management", "Cross-functional coordination", "Data analysis"],
            "processes":           ["Weekly ops reviews", "OKR tracking", "Vendor management", "Process documentation"],
            "interview_questions": [
                "Tell me about a process improvement you drove.",
                "How do you manage competing priorities across teams?",
                "Describe how you've handled a supply chain disruption.",
            ],
            "keywords": ["operations", "process improvement", "project management", "supply chain", "efficiency"],
        },
        "senior": {
            "tools":               ["SAP", "Tableau", "NetSuite", "Jira", "Coupa"],
            "skills":              ["Strategic operations", "Vendor strategy", "Capacity planning", "Executive communication"],
            "processes":           ["Quarterly ops planning", "Vendor QBRs", "Risk management", "Board reporting"],
            "interview_questions": [
                "How do you build scalable operations processes for a fast-growing company?",
                "Walk me through a complex operational initiative you led.",
                "How do you balance cost efficiency with operational resilience?",
            ],
            "keywords": ["operational excellence", "strategy", "vendor management", "cost optimization", "scaling"],
        },
    },

    "Research": {
        "senior": {
            "tools":               ["Python", "PyTorch", "TensorFlow", "Jupyter", "AWS SageMaker", "Weights & Biases"],
            "skills":              ["Research design", "Publication", "Experimental methodology", "Literature review"],
            "processes":           ["Research sprint cycles", "Paper submission process", "Internal tech talks", "Ethics review"],
            "interview_questions": [
                "Walk me through a research project you led from hypothesis to publication.",
                "How do you translate research findings into product impact?",
                "Describe a time your research hypothesis was wrong and what you did.",
            ],
            "keywords": ["ML research", "deep learning", "publication", "experimental design", "applied research"],
        },
    },

    "Infrastructure": {
        "mid": {
            "tools":               ["Terraform", "Kubernetes", "AWS", "Prometheus", "Grafana", "Docker"],
            "skills":              ["Infrastructure as Code", "CI/CD", "Incident response", "Cost optimisation"],
            "processes":           ["On-call rotation", "Change management", "Post-mortem process", "Capacity planning"],
            "interview_questions": [
                "How do you design a zero-downtime deployment pipeline?",
                "Walk me through how you've reduced cloud infrastructure costs.",
                "Describe a major incident you led the response for.",
            ],
            "keywords": ["IaC", "CI/CD", "Kubernetes", "cloud infrastructure", "SRE", "reliability"],
        },
        "senior": {
            "tools":               ["Terraform", "Kubernetes", "AWS", "GCP", "Vault", "Prometheus", "Buildkite"],
            "skills":              ["Platform architecture", "Multi-region design", "Security posture", "Developer experience"],
            "processes":           ["Architecture review", "SLO management", "Disaster recovery", "Security audits"],
            "interview_questions": [
                "How do you design a multi-region, highly available infrastructure?",
                "Walk me through your approach to platform engineering.",
                "How do you balance developer velocity with security and reliability?",
            ],
            "keywords": ["platform engineering", "cloud architecture", "infrastructure strategy", "SRE", "reliability"],
        },
    },

    "Security": {
        "senior": {
            "tools":               ["Snyk", "CrowdStrike", "Okta", "Splunk", "AWS Security Hub", "Wiz"],
            "skills":              ["Threat modelling", "Zero trust", "Penetration testing", "Compliance frameworks"],
            "processes":           ["Vulnerability management", "Security review process", "Incident response", "Security training"],
            "interview_questions": [
                "How do you implement zero trust architecture at scale?",
                "Walk me through a security incident you led the response for.",
                "How do you balance security with developer velocity?",
            ],
            "keywords": ["zero trust", "threat modelling", "appsec", "SOC 2", "penetration testing", "vulnerability management"],
        },
    },

    "Program Management": {
        "mid": {
            "tools":               ["Jira", "Confluence", "Smartsheet", "MS Project", "Slack", "Asana"],
            "skills":              ["Program planning", "Stakeholder management", "Risk management", "Cross-team coordination"],
            "processes":           ["Sprint planning", "Milestone tracking", "Status reporting", "Risk escalation"],
            "interview_questions": [
                "Walk me through how you managed a complex multi-team program.",
                "How do you handle scope creep while maintaining delivery timelines?",
                "Describe a time you had to re-plan a program mid-execution.",
            ],
            "keywords": ["program management", "cross-functional", "milestone tracking", "risk management", "stakeholder alignment"],
        },
        "senior": {
            "tools":               ["Jira", "Confluence", "Smartsheet", "Tableau", "Asana", "MS Project"],
            "skills":              ["Portfolio management", "Executive communication", "Resource planning", "OKR alignment"],
            "processes":           ["Quarterly programme reviews", "Dependency mapping", "Executive status updates", "Post-mortems"],
            "interview_questions": [
                "How do you drive alignment across engineering, product, and operations simultaneously?",
                "Walk me through the most complex programme you've managed end-to-end.",
                "How do you handle competing priorities across multiple product lines?",
            ],
            "keywords": ["TPM", "technical program management", "portfolio", "executive alignment", "delivery"],
        },
        "manager": {
            "tools":               ["Jira", "Confluence", "Tableau", "Smartsheet", "Workday"],
            "skills":              ["Team leadership", "Programme portfolio management", "Executive communication", "Org planning"],
            "processes":           ["Annual programme roadmap", "Team OKRs", "Headcount planning", "Executive reporting"],
            "interview_questions": [
                "How do you build a world-class programme management function?",
                "Walk me through how you've scaled a PMO across multiple business units.",
                "How do you measure programme management team effectiveness?",
            ],
            "keywords": ["PMO", "programme portfolio", "delivery management", "org design", "executive reporting"],
        },
    },

    "Manufacturing": {
        "mid": {
            "tools":               ["SAP", "AutoCAD", "SolidWorks", "MES", "Six Sigma", "Lean tools"],
            "skills":              ["Process optimisation", "Quality control", "Root cause analysis", "BOM management"],
            "processes":           ["Daily production standups", "PFMEA", "Kaizen events", "Line balancing"],
            "interview_questions": [
                "Walk me through a manufacturing process improvement you drove.",
                "How do you approach root cause analysis for a recurring defect?",
                "Describe your experience with lean manufacturing principles.",
            ],
            "keywords": ["manufacturing", "lean", "six sigma", "production", "process improvement", "quality control"],
        },
        "senior": {
            "tools":               ["SAP", "SolidWorks", "CATIA", "MES", "ERP", "Statistical Process Control"],
            "skills":              ["New Product Introduction (NPI)", "Supplier quality", "Capacity planning", "DFM/DFA"],
            "processes":           ["NPI gate reviews", "APQP", "Supplier audits", "Production readiness reviews"],
            "interview_questions": [
                "Walk me through how you've managed a new product introduction from prototype to mass production.",
                "How do you ensure quality at scale across contract manufacturers?",
                "Describe a time you reduced manufacturing cost while maintaining quality.",
            ],
            "keywords": ["NPI", "APQP", "DFM", "supplier quality", "manufacturing engineering", "production"],
        },
    },

    "Professional Services": {
        "mid": {
            "tools":               ["Salesforce", "ServiceNow", "Jira", "Confluence", "Gainsight"],
            "skills":              ["Solution implementation", "Customer onboarding", "Technical configuration", "Training delivery"],
            "processes":           ["Project kickoff", "Solution design workshops", "User acceptance testing", "Go-live handoff"],
            "interview_questions": [
                "Walk me through how you've managed a complex enterprise implementation.",
                "How do you handle a customer who is resistant to change during a rollout?",
                "Describe how you balance multiple simultaneous implementation projects.",
            ],
            "keywords": ["implementation", "professional services", "customer onboarding", "solution delivery", "enterprise rollout"],
        },
        "senior": {
            "tools":               ["Salesforce", "ServiceNow", "Jira", "Tableau", "Gainsight", "NetSuite"],
            "skills":              ["Engagement management", "Solution architecture", "Executive stakeholder management", "Practice development"],
            "processes":           ["Statement of work development", "Executive business reviews", "Delivery methodology", "PS playbook"],
            "interview_questions": [
                "How do you build a professional services delivery practice from scratch?",
                "Walk me through the largest and most complex implementation you've led.",
                "How do you structure a team to deliver complex multi-workstream implementations?",
            ],
            "keywords": ["PS practice", "engagement management", "solution architecture", "enterprise implementation", "delivery excellence"],
        },
    },
}

# Default template for departments/levels not explicitly in the library
DEFAULT_TEMPLATE = {
    "tools":               ["Slack", "Notion", "Google Workspace", "Jira"],
    "skills":              ["Cross-functional collaboration", "Analytical thinking", "Project management", "Communication"],
    "processes":           ["Weekly team standups", "Quarterly OKR reviews", "Monthly reporting", "1:1 check-ins"],
    "interview_questions": [
        "Tell me about a time you successfully led a cross-functional initiative.",
        "How do you prioritise when everything is urgent?",
        "Describe a situation where you had to adapt quickly to change.",
    ],
    "keywords": ["cross-functional", "collaboration", "analytical thinking", "project management"],
}

def get_template(dept_name: str, level: str) -> dict:
    bucket = LEVEL_BUCKETS.get(level, "mid")
    dept_templates = ROLE_TEMPLATES.get(dept_name, {})
    # Fall back to nearest level if exact bucket not found
    for fallback in [bucket, "senior", "mid", "junior"]:
        if fallback in dept_templates:
            return dept_templates[fallback]
    return DEFAULT_TEMPLATE.copy()


# ─── Job-content extraction ───────────────────────────────────────────────────
# Scrapes actual tools/skills/processes from job posting text, then merges
# with template data to produce company-specific, accurate metadata.

# Comprehensive known tools — matched against job posting content
KNOWN_TOOLS_SET: list[str] = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Go", "Golang", "Java", "Ruby", "Rust",
    "C++", "C#", "Kotlin", "Swift", "Scala", "R", "PHP", "Bash", "Shell",
    # Frontend
    "React", "Vue", "Angular", "Next.js", "Svelte", "Redux", "GraphQL", "REST",
    "gRPC", "Tailwind", "HTML", "CSS", "Sass",
    # Backend frameworks
    "Node.js", "Django", "Rails", "FastAPI", "Spring", "Express", "Flask", "Gin",
    # Cloud / Infrastructure
    "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform", "Helm",
    "CloudFormation", "CDK", "Pulumi", "Ansible",
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB", "Cassandra",
    "Snowflake", "BigQuery", "Redshift", "Elasticsearch", "ClickHouse",
    "CockroachDB", "Spanner",
    # Data / ML
    "Spark", "Airflow", "dbt", "Kafka", "Flink", "Databricks", "MLflow",
    "PyTorch", "TensorFlow", "scikit-learn", "Hugging Face", "LangChain",
    "Looker", "Tableau", "Power BI", "Mode", "Hex", "Weights & Biases",
    # Observability / DevOps
    "Datadog", "Prometheus", "Grafana", "PagerDuty", "Splunk", "New Relic",
    "OpenTelemetry", "Sentry",
    # CI/CD
    "GitHub Actions", "CircleCI", "Jenkins", "Buildkite", "GitLab CI",
    # Source control / collaboration
    "GitHub", "GitLab", "Jira", "Confluence", "Notion", "Slack", "Linear",
    "Asana", "Trello",
    # Design
    "Figma", "Sketch", "Zeplin", "Protopie", "Miro", "Adobe XD",
    # Sales / CRM
    "Salesforce", "HubSpot", "Outreach", "Gong", "Clari", "ZoomInfo",
    "LinkedIn Sales Navigator", "DocuSign", "Marketo",
    # Finance / ERP
    "SAP", "Oracle", "NetSuite", "Workday", "Anaplan", "Coupa", "Excel",
    # HR
    "Greenhouse", "Lever", "Workday", "Lattice", "Culture Amp", "Rippling",
    # Security
    "Okta", "Auth0", "Snyk", "CrowdStrike", "Wiz", "Vault",
    # Hardware / manufacturing
    "AutoCAD", "SolidWorks", "CATIA", "MES", "ERP",
]

# Lowercase lookup set for fast matching
_TOOLS_LOWER: dict[str, str] = {t.lower(): t for t in KNOWN_TOOLS_SET}

# Known work processes — extracted verbatim if found in text
KNOWN_PROCESSES_SET: list[str] = [
    "Agile", "Scrum", "Kanban", "Sprint planning", "Daily standup",
    "Sprint retrospective", "Sprint review", "Backlog grooming",
    "Code review", "Pull request", "CI/CD", "Continuous integration",
    "Continuous deployment", "On-call rotation", "Incident response",
    "Post-mortem", "Design review", "RFC process", "Architecture review",
    "A/B testing", "Feature flags", "Blue-green deployment",
    "Pair programming", "Test-driven development", "OKRs", "1:1s",
    "Quarterly planning", "Roadmap planning", "User interviews",
    "Design sprints", "User acceptance testing", "QBRs",
    "Performance reviews", "MEDDIC", "Lean manufacturing", "Kaizen",
    "Six Sigma", "PFMEA", "APQP",
]
_PROCS_LOWER: dict[str, str] = {p.lower(): p for p in KNOWN_PROCESSES_SET}

# ─── Known skills — matched directly against JD text ─────────────────────────
# Professional and technical skills commonly required in job descriptions.
# Matching these against JD text produces much more accurate skill lists than
# regex-scraping bullet points from arbitrary section headers.
KNOWN_SKILLS_SET: list[str] = [
    # Engineering / Technical
    "System design", "Distributed systems", "API design", "Microservices",
    "Software architecture", "Cloud architecture", "Database design",
    "Performance optimization", "Scalability", "High availability",
    "Reliability engineering", "Security engineering", "DevSecOps",
    "Test-driven development", "Unit testing", "Integration testing",
    "Code review", "Technical mentorship", "Technical leadership",
    "Mobile development", "iOS development", "Android development",
    "Embedded systems", "Firmware development", "Machine learning",
    "Deep learning", "Natural language processing", "Computer vision",
    "Data modeling", "ETL pipelines", "Data warehousing",
    "Feature engineering", "Model deployment", "MLOps",
    "Infrastructure as Code", "CI/CD pipelines", "Container orchestration",
    "Network engineering", "Zero-trust security", "Penetration testing",
    "Vulnerability management", "Threat modeling", "Compliance",
    # Product / PM
    "Product strategy", "Roadmap planning", "User research", "A/B testing",
    "Data-driven decision making", "Requirements gathering", "Prioritisation",
    "Go-to-market strategy", "User story writing", "Feature scoping",
    # Design
    "User experience design", "Interaction design", "Visual design",
    "Prototyping", "Design systems", "Accessibility", "Usability testing",
    "Information architecture",
    # Data / Analytics
    "Statistical analysis", "Experimentation design", "Business intelligence",
    "Dashboard design", "Data governance", "Analytics engineering",
    "Quantitative analysis", "SQL", "Python", "R",
    # Sales / GTM
    "Enterprise sales", "Solution selling", "MEDDIC", "Pipeline management",
    "Prospecting", "Cold outreach", "Negotiation", "Commercial negotiation",
    "Account management", "Territory planning", "Forecasting",
    "Partner management", "Channel sales",
    # Marketing
    "Demand generation", "Content marketing", "SEO", "SEM",
    "Marketing analytics", "Brand strategy", "Campaign management",
    "Performance marketing", "Account-based marketing", "GTM execution",
    # Customer Success / Support
    "Relationship management", "Customer onboarding", "Churn prevention",
    "Product adoption", "Escalation management", "Renewal management",
    "Executive sponsorship", "Customer advocacy",
    # Finance
    "Financial modelling", "FP&A", "Budgeting", "Variance analysis",
    "Investor relations", "Scenario planning", "M&A analysis",
    "GAAP accounting", "Board reporting",
    # Operations / PM / Program
    "Cross-functional coordination", "Stakeholder management",
    "Risk management", "Milestone tracking", "Dependency management",
    "Change management", "Process improvement", "Capacity planning",
    "Vendor management", "OKR alignment", "Executive communication",
    # People / HR
    "Talent acquisition", "Performance management", "HRBP",
    "Compensation design", "Org design", "Culture building",
    "Learning and development", "Onboarding", "Workforce planning",
    # Manufacturing
    "Lean manufacturing", "Six Sigma", "Process engineering",
    "Root cause analysis", "Quality control", "DFM", "NPI",
    "Supply chain management", "Supplier quality",
    # Leadership / General
    "People management", "Team building", "Hiring", "Coaching",
    "Conflict resolution", "Executive presence", "Written communication",
    "Presentation skills", "Analytical thinking", "Problem solving",
]
_SKILLS_LOWER: dict[str, str] = {s.lower(): s for s in KNOWN_SKILLS_SET}


def extract_tools_from_text(text: str) -> list[str]:
    """Return tools/technologies mentioned in job posting text (longest match first)."""
    found: list[str] = []
    tl = text.lower()
    # Sort by length desc so "GitHub Actions" matches before "GitHub"
    for tool_lower, tool_display in sorted(_TOOLS_LOWER.items(), key=lambda x: -len(x[0])):
        if re.search(rf"\b{re.escape(tool_lower)}\b", tl):
            # Avoid adding both "GitHub" and "GitHub Actions" if Actions already added
            if not any(tool_lower in f.lower() for f in found):
                found.append(tool_display)
    return found[:10]


def extract_skills_from_text(text: str) -> list[str]:
    """
    Extract skills from JD text using two strategies:
    1. Match against KNOWN_SKILLS_SET (high precision)
    2. Extract clean bullet points from Requirements/Qualifications section
    Combines both, deduplicates, returns up to 8.
    """
    skills: list[str] = []
    seen_lower: set[str] = set()

    # Strategy 1: Match known skills directly against the full text
    tl = text.lower()
    for skill_lower, skill_display in sorted(_SKILLS_LOWER.items(), key=lambda x: -len(x[0])):
        if re.search(rf"\b{re.escape(skill_lower)}\b", tl):
            if skill_lower not in seen_lower:
                seen_lower.add(skill_lower)
                skills.append(skill_display)
        if len(skills) >= 8:
            break

    # Strategy 2: Extract bullet points from requirements section (fills gaps)
    if len(skills) < 4:
        section_match = re.search(
            r"(?:requirements?|qualifications?|what you.{0,10}ll bring|"
            r"what we.{0,10}re looking for|you have|you.{0,5}ll have|"
            r"must have|we need you to have)[:\n\r](.{50,3000}?)(?=\n\n[A-Z]|$)",
            text, re.IGNORECASE | re.DOTALL,
        )
        if section_match:
            section = section_match.group(1)
            bullets = re.findall(r"(?:^|[\n\r])\s*[•\-\*\u2022]\s*(.{15,140})", section)
            for b in bullets[:10]:
                b = clean(b).rstrip(".,;:")
                b = re.sub(
                    r"^(strong |deep |proven |extensive )?(experience|background|knowledge|proficiency|familiarity)\s+(in|with|using|of)\s+",
                    "", b, flags=re.IGNORECASE,
                ).strip()
                if (len(b) > 10 and not re.match(r"^\d+\+?\s+years?", b, re.IGNORECASE)
                        and b.lower() not in seen_lower):
                    seen_lower.add(b.lower())
                    skills.append(b.capitalize())
                if len(skills) >= 8:
                    break

    return skills[:8]


def extract_processes_from_text(text: str) -> list[str]:
    """Return known work processes mentioned in job posting text."""
    found: list[str] = []
    tl = text.lower()
    for proc_lower, proc_display in sorted(_PROCS_LOWER.items(), key=lambda x: -len(x[0])):
        if re.search(rf"\b{re.escape(proc_lower)}\b", tl):
            found.append(proc_display)
    return found[:8]


def generate_interview_questions(
    title: str, level: str, dept: str, tools: list[str], skills: list[str]
) -> list[str]:
    """
    Generate role-specific interview questions from extracted tools/skills.
    Produces 3–5 questions mixing technical depth with behavioral/situational.
    """
    qs: list[str] = []
    tl = title.lower()
    is_manager = level in ("Manager", "Director", "VP")
    is_ic_senior = level in ("L5", "L7 / Staff")

    # 1. Tool-specific technical question (most concrete, JD-derived)
    if tools:
        tool = tools[0]
        if dept == "Engineering" or re.search(r"\bengineer\b|\bdeveloper\b|\bsre\b", tl):
            qs.append(f"Walk me through how you've used {tool} in a high-scale production environment.")
        elif dept in ("Data & Analytics", "Research"):
            qs.append(f"Describe a data pipeline or analysis you built end-to-end using {tool}.")
        elif dept == "Sales":
            qs.append(f"How do you use {tool} to manage your pipeline and forecast accurately?")
        elif dept == "Marketing":
            qs.append(f"Walk me through a campaign you ran using {tool}. What did you learn?")
        else:
            qs.append(f"How have you used {tool} day-to-day in your current role?")

    # 2. Second tool or primary skill question
    if len(tools) >= 2:
        tool2 = tools[1]
        qs.append(f"Tell me about a time {tool2} helped you solve a difficult problem.")
    elif skills:
        skill = skills[0]
        if "design" in skill.lower() or "architect" in skill.lower():
            qs.append(f"Walk me through a system or solution you designed that required strong {skill.lower()}.")
        else:
            qs.append(f"Give me an example of when {skill.lower()} made a critical difference in your work.")

    # 3. Level-appropriate depth question
    if is_manager:
        qs.append(
            "Tell me about a time you had to give difficult feedback to a direct report. "
            "What was the outcome?"
        )
        qs.append(
            f"How do you balance shipping velocity with long-term quality on your {dept.lower()} team?"
        )
    elif is_ic_senior:
        if dept == "Engineering":
            qs.append(
                "Describe an architectural decision you made that had significant long-term impact. "
                "What trade-offs did you consider?"
            )
        elif dept == "Data & Analytics":
            qs.append(
                "Walk me through the most complex data model or experimentation framework you've built. "
                "What were the key design decisions?"
            )
        else:
            qs.append(
                f"Describe the most complex {dept.lower()} initiative you've led. "
                "How did you handle ambiguity and competing priorities?"
            )
    else:
        # Mid-level
        if dept == "Engineering":
            qs.append("How do you approach debugging a production issue you've never seen before?")
        elif dept == "Sales":
            qs.append("Walk me through how you qualified and closed the most difficult deal of your career.")
        elif dept == "Product":
            qs.append("How do you decide what NOT to build when your roadmap is overloaded?")
        else:
            qs.append(
                f"Tell me about a time you had to influence a decision in your {dept.lower()} role "
                "without direct authority."
            )

    # 4. Second skill-based behavioral question
    if len(skills) >= 2:
        skill2 = skills[1]
        qs.append(
            f"Describe a situation where {skill2.lower()} was essential to delivering a successful outcome."
        )

    return qs[:5]


def enrich_role_metadata(role_raw: dict, template: dict) -> dict:
    """
    Build final metadata from scraped JD content + template fallback.
    Scraped data always wins when it yields ≥ N items; templates only fill gaps.
    Interview questions are generated from extracted data (not templates).
    """
    content = role_raw.get("_content", "")
    title   = role_raw.get("title", "")
    level   = role_raw.get("_level", infer_level(title))
    dept    = role_raw.get("dept", infer_dept_name(title))

    # ── Tools ────────────────────────────────────────────────────────────────
    scraped_tools = extract_tools_from_text(content) if content else []
    tmpl_tools    = template.get("tools", [])
    tools = scraped_tools[:]
    for t in tmpl_tools:
        if t not in tools and len(tools) < 8:
            tools.append(t)
    tools = tools or tmpl_tools

    # ── Skills ───────────────────────────────────────────────────────────────
    scraped_skills = extract_skills_from_text(content) if content else []
    tmpl_skills    = template.get("skills", [])
    # Use scraped if ≥2 found; otherwise template fills
    if len(scraped_skills) >= 2:
        skills = scraped_skills[:]
        for s in tmpl_skills:
            if s not in skills and len(skills) < 8:
                skills.append(s)
    else:
        skills = tmpl_skills[:]

    # ── Processes ────────────────────────────────────────────────────────────
    scraped_procs = extract_processes_from_text(content) if content else []
    tmpl_procs    = template.get("processes", [])
    procs = scraped_procs[:]
    for p in tmpl_procs:
        if p.lower() not in [x.lower() for x in procs] and len(procs) < 6:
            procs.append(p)
    procs = procs or tmpl_procs

    # ── Interview questions ───────────────────────────────────────────────────
    # Always generate from extracted data so questions are role/tool-specific.
    # Fall back to template questions only if generation fails.
    try:
        iqs = generate_interview_questions(title, level, dept, tools, skills)
    except Exception:
        iqs = []
    if not iqs:
        iqs = template.get("interview_questions", [])

    return {
        "tools":               tools,
        "skills":              skills,
        "processes":           procs,
        "interview_questions": iqs,
        "keywords":            template.get("keywords", []),
    }


# ─── ATS API scrapers ─────────────────────────────────────────────────────────
# These return {title, dept, _content, _score, _source} dicts.
# _content is the full job description text used for metadata extraction.

# Greenhouse board slugs — many public tech companies use Greenhouse
GREENHOUSE_SLUGS: dict[str, str] = {
    "stripe":       "stripe",
    "airbnb":       "airbnb",
    "netflix":      "netflix",
    "uber":         "uber",
    "spotify":      "spotify",
    "shopify":      "shopify",
    "figma":        "figma",
    "notion":       "notion",
    "plaid":        "plaid",
    "brex":         "brex",
    "ramp":         "ramp",
    "robinhood":    "robinhood",
    "coinbase":     "coinbase",
    "doordash":     "doordash",
    "snowflake":    "snowflake",
    "databricks":   "databricks",
    "confluent":    "confluent",
    "hashicorp":    "hashicorp",
    "datadog":      "datadog",
    "twilio":       "twilio",
    "segment":      "segment",
    "gusto":        "gusto",
    "checkr":       "checkr",
}

# Lever slugs
LEVER_SLUGS: dict[str, str] = {
    "scale ai":   "scale-ai",
    "scale":      "scale-ai",
    "vercel":     "vercel",
    "linear":     "linear",
    "retool":     "retool",
    "anthropic":  "anthropic",
    "openai":     "openai",
    "perplexity": "perplexity",
    "cursor":     "cursor",
}

# Workday: company.wd1.myworkdayjobs.com (most Fortune 500s)
# Slug = subdomain used by the company's Workday tenant
WORKDAY_SLUGS: dict[str, tuple[str, str]] = {
    # (subdomain, board_name) — board_name = path segment after /en-US/
    "apple":         ("apple",        "Apple_External_Careers"),
    "google":        ("google",       "External"),
    "microsoft":     ("microsoft",    "External"),
    "netflix":       ("netflix",      "External"),
    "deloitte":      ("deloitte",     "External"),
    "johnson":       ("jnj",          "External"),
    "mckinsey":      ("mckinsey",     "External"),
    "honeywell":     ("honeywell",    "Honeywell_Ext"),
    "tesla":         ("tesla",        "Tesla_External_Jobs"),
    "salesforce":    ("salesforce",   "External"),
    "uber":          ("uber",         "External"),
    "nike":          ("nike",         "External"),
    "boeing":        ("boeing",       "external"),
    "amazon":        ("amazon",       "external"),
    "meta":          ("meta",         "External"),
    "ibm":           ("ibm",          "External"),
    "intel":         ("intel",        "Intel_External"),
    "cisco":         ("cisco",        "Cisco_External_Site"),
    "oracle":        ("oracle",       "External"),
    "sap":           ("sap",          "External"),
    "pwc":           ("pwc",          "Global_External_Careers"),
    "accenture":     ("accenture",    "AccentureCareers"),
    "zebra":         ("zebra",        "Zebra_External"),
    "datalogic":     ("datalogic",    "External"),
}

# SmartRecruiters: api.smartrecruiters.com — used by many B2B SaaS companies
SMARTRECRUITERS_SLUGS: dict[str, str] = {
    "zendesk":      "Zendesk",
    "atlassian":    "ATLASSIAN",
    "cloudflare":   "Cloudflare",
    "mongodb":      "MongoDB",
    "elastic":      "Elastic",
    "splunk":       "Splunk",
    "pagerduty":    "PagerDuty",
    "twilio":       "Twilio",
    "fastly":       "Fastly",
    "new relic":    "NewRelic",
    "okta":         "Okta",
    "mixpanel":     "Mixpanel",
    "amplitude":    "Amplitude",
    "braze":        "Braze",
    "contentful":   "Contentful",
    "algolia":      "Algolia",
}

# Ashby: emerging ATS used by high-growth tech cos
ASHBY_SLUGS: dict[str, str] = {
    "linear":     "linear",
    "vercel":     "vercel",
    "retool":     "retool",
    "figma":      "figma",
    "notion":     "notion",
    "mercury":    "mercury",
    "loom":       "loom",
    "rippling":   "rippling",
    "gusto":      "gusto",
    "brex":       "brex",
    "ramp":       "ramp",
}


def _get_greenhouse_slug(company: str) -> Optional[str]:
    cl = company.lower()
    for key, slug in GREENHOUSE_SLUGS.items():
        if key in cl:
            return slug
    # Generic guess: first word, alphanumeric only
    guess = re.sub(r"[^a-z0-9]", "", cl.split()[0])
    return guess if len(guess) >= 3 else None


def scrape_greenhouse(sess: Session, company: str, max_jobs: int = 40) -> list[dict]:
    """Fetch open jobs from Greenhouse Jobs API with full description content."""
    slug = _get_greenhouse_slug(company)
    if not slug:
        return []

    list_url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"
    try:
        r = sess.get(list_url, timeout=10)
        if r.status_code != 200:
            log.debug("Greenhouse [%s] returned %d", slug, r.status_code)
            return []
        jobs_data = r.json().get("jobs", [])[:max_jobs]
    except Exception as e:
        log.debug("Greenhouse list failed: %s", e)
        return []

    results: list[dict] = []
    for job in jobs_data:
        title = clean(job.get("title", ""))
        job_id = job.get("id")
        if not title or not job_id:
            continue

        # Fetch job detail for description content
        content_text = ""
        try:
            dr = sess.get(f"{list_url}/{job_id}", timeout=8)
            if dr.status_code == 200:
                html = dr.json().get("content", "")
                content_text = BeautifulSoup(html, "html.parser").get_text(" ") if html else ""
        except Exception:
            pass

        results.append({
            "title":    title,
            "dept":     infer_dept_name(title),
            "_content": content_text,
            "_score":   6,
            "_source":  "greenhouse",
        })
        time.sleep(0.05)  # gentle rate limit

    log.info("Greenhouse [%s]: %d jobs", slug, len(results))
    return results


def _get_lever_slug(company: str) -> Optional[str]:
    cl = company.lower()
    for key, slug in LEVER_SLUGS.items():
        if key in cl:
            return slug
    return re.sub(r"[^a-z0-9-]", "", cl.replace(" ", "-")).strip("-") or None


def scrape_lever(sess: Session, company: str, max_jobs: int = 40) -> list[dict]:
    """Fetch open jobs from Lever Jobs API with description content."""
    slug = _get_lever_slug(company)
    if not slug:
        return []

    url = f"https://api.lever.co/v0/postings/{slug}?mode=json&limit=250"
    try:
        r = sess.get(url, timeout=10)
        if r.status_code != 200:
            log.debug("Lever [%s] returned %d", slug, r.status_code)
            return []
        postings = r.json()[:max_jobs]
    except Exception as e:
        log.debug("Lever failed: %s", e)
        return []

    results: list[dict] = []
    for p in postings:
        title = clean(p.get("text", ""))
        if not title:
            continue
        # Combine all content sections
        content_parts = [p.get("descriptionBody", "")]
        for lst in p.get("lists", []):
            content_parts.append(lst.get("content", ""))
        content_text = BeautifulSoup(" ".join(content_parts), "html.parser").get_text(" ")

        results.append({
            "title":    title,
            "dept":     infer_dept_name(title),
            "_content": content_text,
            "_score":   6,
            "_source":  "lever",
        })

    log.info("Lever [%s]: %d jobs", slug, len(results))
    return results


def _get_workday_info(company: str) -> Optional[tuple[str, str]]:
    cl = company.lower()
    for key, (sub, board) in WORKDAY_SLUGS.items():
        if key in cl or cl.startswith(key):
            return sub, board
    return None


def scrape_workday(sess: Session, company: str, max_jobs: int = 30) -> list[dict]:
    """
    Fetch open jobs from Workday ATS.
    API pattern: https://{sub}.wd1.myworkdayjobs.com/wday/cxs/{sub}/{board}/jobs
    Job detail: POST to jobs/{id} (or GET with content endpoint)
    """
    info = _get_workday_info(company)
    if not info:
        return []
    sub, board = info

    # Try multiple Workday tenant numbers (wd1, wd3, wd5)
    for tenant_num in ["wd1", "wd3", "wd5"]:
        base = f"https://{sub}.{tenant_num}.myworkdayjobs.com"
        list_url = f"{base}/wday/cxs/{sub}/{board}/jobs"
        try:
            r = sess.s.post(
                list_url,
                json={"appliedFacets": {}, "limit": max_jobs, "offset": 0, "searchText": ""},
                headers={**HEADERS, "Content-Type": "application/json", "Accept": "application/json"},
                timeout=12,
            )
            if r.status_code != 200:
                continue
            data = r.json()
            job_postings = data.get("jobPostings", [])
            if not job_postings:
                continue

            results: list[dict] = []
            for jp in job_postings[:max_jobs]:
                title = clean(jp.get("title", ""))
                if not title:
                    continue
                # Fetch job description via external URL
                ext_url = jp.get("externalPath", "")
                content_text = ""
                if ext_url:
                    try:
                        detail_url = f"{base}/wday/cxs/{sub}/{board}{ext_url}"
                        dr = sess.s.post(
                            detail_url,
                            json={},
                            headers={**HEADERS, "Content-Type": "application/json", "Accept": "application/json"},
                            timeout=8,
                        )
                        if dr.status_code == 200:
                            ddata = dr.json()
                            job_detail = ddata.get("jobPostingInfo", {})
                            html = job_detail.get("jobDescription", "")
                            if html:
                                content_text = BeautifulSoup(html, "html.parser").get_text(" ")
                    except Exception:
                        pass
                results.append({
                    "title":    title,
                    "dept":     infer_dept_name(title),
                    "_content": content_text,
                    "_score":   7,
                    "_source":  "workday",
                })
                time.sleep(0.05)
            log.info("Workday [%s/%s]: %d jobs", sub, board, len(results))
            return results
        except Exception as e:
            log.debug("Workday [%s/%s tenant=%s] failed: %s", sub, board, tenant_num, e)
    return []


def _get_smartrecruiters_slug(company: str) -> Optional[str]:
    cl = company.lower()
    for key, slug in SMARTRECRUITERS_SLUGS.items():
        if key in cl or cl.startswith(key):
            return slug
    return None


def scrape_smartrecruiters(sess: Session, company: str, max_jobs: int = 25) -> list[dict]:
    """Fetch jobs from SmartRecruiters public API with full description content."""
    slug = _get_smartrecruiters_slug(company)
    if not slug:
        return []

    list_url = f"https://api.smartrecruiters.com/v1/companies/{slug}/postings"
    try:
        r = sess.get(list_url, timeout=10)
        if r.status_code != 200:
            log.debug("SmartRecruiters [%s] returned %d", slug, r.status_code)
            return []
        postings = r.json().get("content", [])[:max_jobs]
    except Exception as e:
        log.debug("SmartRecruiters failed: %s", e)
        return []

    results: list[dict] = []
    for p in postings:
        title = clean(p.get("name", ""))
        job_id = p.get("id", "")
        if not title or not job_id:
            continue
        content_text = ""
        try:
            dr = sess.get(f"{list_url}/{job_id}", timeout=8)
            if dr.status_code == 200:
                ddata = dr.json()
                sections = ddata.get("jobAd", {}).get("sections", {})
                parts = [
                    sections.get("jobDescription", {}).get("text", ""),
                    sections.get("qualifications", {}).get("text", ""),
                    sections.get("additionalInformation", {}).get("text", ""),
                ]
                html = " ".join(filter(None, parts))
                content_text = BeautifulSoup(html, "html.parser").get_text(" ") if html else ""
        except Exception:
            pass
        results.append({
            "title":    title,
            "dept":     infer_dept_name(title),
            "_content": content_text,
            "_score":   6,
            "_source":  "smartrecruiters",
        })
        time.sleep(0.05)

    log.info("SmartRecruiters [%s]: %d jobs", slug, len(results))
    return results


def _get_ashby_slug(company: str) -> Optional[str]:
    cl = company.lower()
    for key, slug in ASHBY_SLUGS.items():
        if key in cl or cl.startswith(key):
            return slug
    return None


def scrape_ashby(sess: Session, company: str, max_jobs: int = 25) -> list[dict]:
    """Fetch jobs from Ashby public jobs API with descriptions."""
    slug = _get_ashby_slug(company)
    if not slug:
        return []

    list_url = "https://api.ashbyhq.com/posting-api/job-board"
    try:
        r = sess.s.post(
            list_url,
            json={"boardIdentifier": slug},
            headers={**HEADERS, "Content-Type": "application/json"},
            timeout=10,
        )
        if r.status_code != 200:
            log.debug("Ashby [%s] returned %d", slug, r.status_code)
            return []
        jobs = r.json().get("jobPostings", [])[:max_jobs]
    except Exception as e:
        log.debug("Ashby failed: %s", e)
        return []

    results: list[dict] = []
    for job in jobs:
        title = clean(job.get("title", ""))
        job_id = job.get("id", "")
        if not title:
            continue
        content_text = ""
        # Description is sometimes embedded in the list response
        html = job.get("descriptionHtml", "") or job.get("description", "")
        if html:
            content_text = BeautifulSoup(html, "html.parser").get_text(" ")
        elif job_id:
            try:
                dr = sess.s.post(
                    "https://api.ashbyhq.com/posting-api/job-board/posting",
                    json={"boardIdentifier": slug, "jobPostingId": job_id},
                    headers={**HEADERS, "Content-Type": "application/json"},
                    timeout=8,
                )
                if dr.status_code == 200:
                    dhtml = dr.json().get("descriptionHtml", "")
                    content_text = BeautifulSoup(dhtml, "html.parser").get_text(" ") if dhtml else ""
            except Exception:
                pass
        results.append({
            "title":    title,
            "dept":     infer_dept_name(title),
            "_content": content_text,
            "_score":   6,
            "_source":  "ashby",
        })

    log.info("Ashby [%s]: %d jobs", slug, len(results))
    return results


def scrape_indeed_with_content(sess: Session, company: str) -> list[dict]:
    """
    Fetch Indeed search results and follow individual job links to get
    full description content for metadata extraction.
    """
    from urllib.parse import urljoin
    SEARCH_URL = f"https://www.indeed.com/jobs?q=%22{quote_plus(company)}%22&l=&fromage=any&limit=15"
    results: list[dict] = []
    try:
        r = sess.s.get(SEARCH_URL, headers={**HEADERS, "Referer": "https://www.indeed.com/"}, timeout=12)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")

        # Extract job cards with links
        job_cards = soup.select("div.job_seen_beacon, div[data-testid='jobListing']")
        for card in job_cards[:15]:
            # Get title
            title_el = card.select_one("h2.jobTitle span[title], h2.jobTitle a span, .jobTitle span")
            if not title_el:
                continue
            title = clean(title_el.get_text())
            if not title:
                continue

            # Get job detail link
            link_el = card.select_one("a[id^='job_'], a.jcs-JobTitle, h2.jobTitle a")
            content_text = ""
            if link_el and link_el.get("href"):
                job_url = urljoin("https://www.indeed.com", link_el["href"])
                try:
                    jr = sess.s.get(job_url, headers={**HEADERS, "Referer": SEARCH_URL}, timeout=10)
                    if jr.status_code == 200:
                        jsooup = BeautifulSoup(jr.text, "html.parser")
                        desc = jsooup.select_one("#jobDescriptionText, .jobsearch-jobDescriptionText")
                        if desc:
                            content_text = clean(desc.get_text(" "))
                except Exception:
                    pass
                time.sleep(0.2)

            results.append({
                "title":    title,
                "dept":     infer_dept_name(title),
                "_content": content_text,
                "_score":   4,
                "_source":  "indeed_detail",
            })
    except Exception as e:
        log.debug("Indeed with content failed: %s", e)

    log.info("Indeed with content: %d jobs", len(results))
    return results[:15]


# ─── Tier 1: Indeed job search ────────────────────────────────────────────────

INDEED_URL = "https://www.indeed.com/jobs?q=%22{q}%22&l=&fromage=any&limit=20"

def scrape_indeed(sess: Session, company: str) -> list[str]:
    """Return list of raw job titles from Indeed search results."""
    url = INDEED_URL.format(q=quote_plus(company))
    titles: list[str] = []
    try:
        r = sess.s.get(url, headers={
            **HEADERS,
            "Referer": "https://www.indeed.com/",
        }, timeout=12, allow_redirects=True)
        if r.status_code != 200:
            log.debug("Indeed returned %d", r.status_code)
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        # Try multiple selectors (Indeed periodically updates classes)
        for selector in [
            "h2.jobTitle span[title]",
            "h2.jobTitle a span",
            ".jobTitle span",
            "h2 a span[title]",
            ".job_seen_beacon h2 span",
        ]:
            found = [clean(t.get_text()) for t in soup.select(selector) if t.get_text(strip=True)]
            if found:
                titles = found
                break
    except Exception as e:
        log.debug("Indeed scrape failed: %s", e)
    log.info("Indeed: %d job titles", len(titles))
    return titles[:25]


# ─── Tier 2: Company careers page ────────────────────────────────────────────

_CAREERS_PATHS = [
    "/careers", "/jobs", "/about/careers", "/company/careers",
    "/work-with-us", "/join-us",
]

def scrape_company_careers(sess: Session, website: str, company: str) -> list[str]:
    burl = base_url(website)
    titles: list[str] = []
    seen: set[str] = set()
    for path in _CAREERS_PATHS:
        soup = fetch_soup(sess, burl + path, timeout=10)
        if not soup:
            continue
        # Job titles in headings or links
        for el in soup.find_all(["h2", "h3", "h4", "a"]):
            text = clean(el.get_text())
            if 3 < len(text) < 80 and text not in seen:
                # Must look like a job title (not a navigation link)
                if any(kw in text.lower() for row in TITLE_TO_DEPT for kw in [row[0][:10]]):
                    seen.add(text)
                    titles.append(text)
        if len(titles) >= 15:
            break
    log.info("Company careers: %d job titles", len(titles))
    return titles[:20]


# ─── Tier 3: Yahoo search for jobs ───────────────────────────────────────────

YAHOO_SEARCH = "https://search.yahoo.com/search?p={q}&n=10"

_LINKEDIN_HIRING_RE = re.compile(
    r"^.{1,60}?\s+(hiring|jobs?,?|employment|careers?|openings?)\s*[,.]?\s*",
    re.IGNORECASE,
)
_LOCATION_SUFFIX_RE = re.compile(
    r"\s+(in\s+[\w\s,]+|at\s+[\w\s,]+|[-–|]\s*[\w\s,]+)$",
    re.IGNORECASE,
)

def scrape_yahoo_jobs(sess: Session, company: str) -> list[str]:
    queries = [
        f'site:linkedin.com/jobs "{company}" engineer manager director',
        f'site:indeed.com "{company}" senior engineer manager analyst',
    ]
    titles: list[str] = []
    seen: set[str] = set()
    for query in queries:
        url = YAHOO_SEARCH.format(q=quote_plus(query))
        try:
            r = sess.s.get(url, headers=HEADERS, timeout=12)
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "html.parser")
            for h3 in soup.select("h3.title"):
                text = clean(h3.get_text())

                # Step 1: Strip trailing " | LinkedIn", " | Indeed", " - Glassdoor" etc.
                for sep in [" | LinkedIn", " | Indeed", " | Glassdoor", " | ZipRecruiter",
                            " - LinkedIn", " - Indeed", " - Glassdoor"]:
                    if text.endswith(sep):
                        text = text[: -len(sep)].strip()
                        break

                # Step 2: Strip "CompanyName hiring X in Location" pattern
                # e.g. "Stripe hiring Engineering Manager, Connect in United States"
                m = re.match(
                    rf"^{re.escape(company)}\s+hiring\s+(.+?)(?:\s+in\s+.+)?$",
                    text, re.IGNORECASE
                )
                if m:
                    text = m.group(1).strip()

                # Step 3: Strip "CompanyName X Jobs, Employment | ..." pattern
                # e.g. "Stripe Senior Engineer Jobs, Employment"
                m2 = re.match(
                    rf"^{re.escape(company)}\s+(.+?)\s+jobs?,?\s+employment.*$",
                    text, re.IGNORECASE
                )
                if m2:
                    text = m2.group(1).strip()

                # Step 4: Strip generic separators
                for sep in [" - ", " | ", " — ", " @ "]:
                    if sep in text:
                        text = text.split(sep)[0].strip()
                        break

                # Step 5: Strip location suffixes "in United States", "in San Francisco, CA"
                text = re.sub(r"\s+in\s+[A-Z][a-zA-Z,\s]+$", "", text).strip()

                # Step 6: Reject obviously bad titles
                if any(text.lower() == bad for bad in ["job search", "jobs", "careers", "employment"]):
                    continue
                if re.match(r"^(jobs?|careers?|employment|openings?)\b", text, re.IGNORECASE):
                    continue

                if 4 < len(text) < 80 and text not in seen:
                    seen.add(text)
                    titles.append(text)
        except Exception as e:
            log.debug("Yahoo jobs search failed: %s", e)
        time.sleep(0.4)
    log.info("Yahoo jobs: %d titles", len(titles))
    return titles[:20]


# ─── Curated company-specific roles ──────────────────────────────────────────

KNOWN_ROLES: dict[str, list[dict]] = {
    "tesla": [
        {"title": "Software Engineer, Autopilot",              "dept": "Engineering"},
        {"title": "Senior Staff Software Engineer, Vehicle UI","dept": "Engineering"},
        {"title": "Embedded Systems Engineer",                 "dept": "Engineering"},
        {"title": "Engineering Manager, Firmware",             "dept": "Engineering"},
        {"title": "Technical Program Manager, Vehicle Software","dept": "Program Management"},
        {"title": "Senior Program Manager, Manufacturing",     "dept": "Program Management"},
        {"title": "Senior Product Manager, Energy",            "dept": "Product"},
        {"title": "Product Manager, Charging",                 "dept": "Product"},
        {"title": "Data Scientist, Manufacturing Analytics",   "dept": "Data & Analytics"},
        {"title": "Machine Learning Engineer",                 "dept": "Data & Analytics"},
        {"title": "UX Designer, In-Car Experience",            "dept": "Design"},
        {"title": "Account Executive, Fleet Sales",            "dept": "Sales"},
        {"title": "Regional Sales Manager",                    "dept": "Sales"},
        {"title": "Senior Financial Analyst",                  "dept": "Finance"},
        {"title": "FP&A Manager",                              "dept": "Finance"},
        {"title": "Technical Recruiter",                       "dept": "People & HR"},
        {"title": "Supply Chain Manager",                      "dept": "Operations"},
        {"title": "Manufacturing Engineer, Battery",           "dept": "Manufacturing"},
        {"title": "Senior Manufacturing Engineer",             "dept": "Manufacturing"},
        {"title": "Process Engineer, Gigafactory",             "dept": "Manufacturing"},
        {"title": "Research Engineer, Autonomy",               "dept": "Research"},
    ],
    "apple": [
        {"title": "Software Engineer, iOS",                    "dept": "Engineering"},
        {"title": "Senior Software Engineer, macOS",           "dept": "Engineering"},
        {"title": "Senior Software Engineer, Frameworks",      "dept": "Engineering"},
        {"title": "Product Manager, App Store",                "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Machine Learning Researcher",               "dept": "Research"},
        {"title": "Research Scientist, AI/ML",                 "dept": "Research"},
        {"title": "UX Researcher",                             "dept": "Design"},
        {"title": "Senior Product Designer",                   "dept": "Design"},
        {"title": "Enterprise Account Executive",              "dept": "Sales"},
        {"title": "Financial Analyst, FP&A",                   "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
        {"title": "Senior Security Engineer",                  "dept": "Security"},
        {"title": "Platform Infrastructure Engineer",          "dept": "Infrastructure"},
    ],
    "google": [
        {"title": "Software Engineer III",                     "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Staff Software Engineer",                   "dept": "Engineering"},
        {"title": "Product Manager II",                        "dept": "Product"},
        {"title": "Senior Product Manager, Google Cloud",      "dept": "Product"},
        {"title": "Senior Data Scientist",                     "dept": "Data & Analytics"},
        {"title": "Data Engineer",                             "dept": "Data & Analytics"},
        {"title": "UX Designer",                               "dept": "Design"},
        {"title": "Account Executive, Google Cloud",           "dept": "Sales"},
        {"title": "Technical Program Manager II",              "dept": "Program Management"},
        {"title": "Senior Technical Program Manager",          "dept": "Program Management"},
        {"title": "Research Scientist",                        "dept": "Research"},
        {"title": "Site Reliability Engineer",                 "dept": "Infrastructure"},
        {"title": "Security Engineer",                         "dept": "Security"},
    ],
    "microsoft": [
        {"title": "Software Engineer II",                      "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Principal Software Engineer",               "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager, Azure",             "dept": "Product"},
        {"title": "Senior Data Scientist",                     "dept": "Data & Analytics"},
        {"title": "UX Designer",                               "dept": "Design"},
        {"title": "Enterprise Account Executive",              "dept": "Sales"},
        {"title": "Senior Program Manager",                    "dept": "Program Management"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Senior Security Engineer",                  "dept": "Security"},
        {"title": "Cloud Solutions Architect",                 "dept": "Engineering"},
    ],
    "salesforce": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Account Executive, Enterprise",             "dept": "Sales"},
        {"title": "Senior Account Executive",                  "dept": "Sales"},
        {"title": "Customer Success Manager",                  "dept": "Customer Success"},
        {"title": "Senior Customer Success Manager",           "dept": "Customer Success"},
        {"title": "Solutions Engineer",                        "dept": "Engineering"},
        {"title": "Senior Solutions Consultant",               "dept": "Professional Services"},
        {"title": "Implementation Architect",                  "dept": "Professional Services"},
        {"title": "Technical Architect",                       "dept": "Professional Services"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
        {"title": "Talent Acquisition Partner",                "dept": "People & HR"},
    ],
    "zebra": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Field Application Engineer",                "dept": "Engineering"},
        {"title": "Firmware Engineer",                         "dept": "Engineering"},
        {"title": "Hardware Engineer",                         "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager",                    "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Senior Program Manager",                    "dept": "Program Management"},
        {"title": "Program Manager, NPI",                      "dept": "Program Management"},
        {"title": "Account Manager",                           "dept": "Sales"},
        {"title": "Senior Account Manager",                    "dept": "Sales"},
        {"title": "Channel Sales Manager",                     "dept": "Sales"},
        {"title": "Solutions Consultant",                      "dept": "Sales"},
        {"title": "Professional Services Engineer",            "dept": "Professional Services"},
        {"title": "Solutions Architect",                       "dept": "Professional Services"},
        {"title": "Implementation Specialist",                 "dept": "Professional Services"},
        {"title": "Supply Chain Analyst",                      "dept": "Operations"},
        {"title": "Operations Manager",                        "dept": "Operations"},
        {"title": "Manufacturing Engineer",                    "dept": "Manufacturing"},
        {"title": "Senior Manufacturing Engineer",             "dept": "Manufacturing"},
        {"title": "Process Engineer",                          "dept": "Manufacturing"},
        {"title": "Quality Engineer",                          "dept": "Manufacturing"},
        {"title": "Technical Support Engineer",                "dept": "Customer Success"},
        {"title": "Customer Success Manager",                  "dept": "Customer Success"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "FP&A Manager",                              "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
        {"title": "Technical Recruiter",                       "dept": "People & HR"},
        {"title": "IT Systems Administrator",                  "dept": "IT"},
        {"title": "Senior Research Engineer",                  "dept": "Research"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
    ],
    "stripe": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Staff Software Engineer",                   "dept": "Engineering"},
        {"title": "Engineering Manager",                       "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager",                    "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
        {"title": "Senior Data Scientist",                     "dept": "Data & Analytics"},
        {"title": "Analytics Engineer",                        "dept": "Data & Analytics"},
        {"title": "Product Designer",                          "dept": "Design"},
        {"title": "Senior Product Designer",                   "dept": "Design"},
        {"title": "Enterprise Account Executive",              "dept": "Sales"},
        {"title": "Account Executive, Mid-Market",             "dept": "Sales"},
        {"title": "Solutions Engineer",                        "dept": "Sales"},
        {"title": "Customer Success Manager",                  "dept": "Customer Success"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "FP&A Manager",                              "dept": "Finance"},
        {"title": "Senior Security Engineer",                  "dept": "Security"},
        {"title": "Infrastructure Engineer",                   "dept": "Infrastructure"},
        {"title": "Site Reliability Engineer",                 "dept": "Infrastructure"},
        {"title": "Technical Recruiter",                       "dept": "People & HR"},
        {"title": "Senior Legal Counsel",                      "dept": "Legal"},
    ],
    "spotify": [
        {"title": "Backend Engineer",                          "dept": "Engineering"},
        {"title": "Senior Backend Engineer",                   "dept": "Engineering"},
        {"title": "iOS Engineer",                              "dept": "Engineering"},
        {"title": "Android Engineer",                          "dept": "Engineering"},
        {"title": "Engineering Manager",                       "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager",                    "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
        {"title": "Senior Data Scientist",                     "dept": "Data & Analytics"},
        {"title": "Machine Learning Engineer",                 "dept": "Data & Analytics"},
        {"title": "Product Designer",                          "dept": "Design"},
        {"title": "UX Researcher",                             "dept": "Design"},
        {"title": "Senior Product Designer",                   "dept": "Design"},
        {"title": "Research Scientist",                        "dept": "Research"},
        {"title": "Marketing Manager",                         "dept": "Marketing"},
        {"title": "Brand Partnerships Manager",                "dept": "Marketing"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "Site Reliability Engineer",                 "dept": "Infrastructure"},
        {"title": "Legal Counsel",                             "dept": "Legal"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
    ],
    "mckinsey": [
        {"title": "Business Analyst",                          "dept": "Operations"},
        {"title": "Associate",                                 "dept": "Operations"},
        {"title": "Engagement Manager",                        "dept": "Operations"},
        {"title": "Senior Engagement Manager",                 "dept": "Operations"},
        {"title": "Partner",                                   "dept": "Operations"},
        {"title": "Senior Partner",                            "dept": "Operations"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
        {"title": "Technology Consultant",                     "dept": "Engineering"},
        {"title": "Digital Expert",                            "dept": "Data & Analytics"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
        {"title": "Knowledge Analyst",                         "dept": "Research"},
        {"title": "Senior Knowledge Analyst",                  "dept": "Research"},
    ],
    "johnson": [
        {"title": "Research Scientist",                        "dept": "Research"},
        {"title": "Senior Research Scientist",                 "dept": "Research"},
        {"title": "Principal Scientist",                       "dept": "Research"},
        {"title": "Clinical Research Associate",               "dept": "Research"},
        {"title": "Regulatory Affairs Specialist",             "dept": "Legal"},
        {"title": "Senior Regulatory Affairs Manager",         "dept": "Legal"},
        {"title": "Sales Representative, Medical Devices",     "dept": "Sales"},
        {"title": "Account Manager, Surgical",                 "dept": "Sales"},
        {"title": "Manufacturing Engineer",                    "dept": "Manufacturing"},
        {"title": "Senior Manufacturing Engineer",             "dept": "Manufacturing"},
        {"title": "Quality Engineer",                          "dept": "Manufacturing"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Supply Chain Manager",                      "dept": "Operations"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
        {"title": "Medical Science Liaison",                   "dept": "Research"},
    ],
    "deloitte": [
        {"title": "Business Technology Analyst",               "dept": "Engineering"},
        {"title": "Consultant",                                "dept": "Operations"},
        {"title": "Senior Consultant",                         "dept": "Operations"},
        {"title": "Manager",                                   "dept": "Operations"},
        {"title": "Senior Manager",                            "dept": "Operations"},
        {"title": "Director",                                  "dept": "Operations"},
        {"title": "Principal",                                 "dept": "Operations"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
        {"title": "Cloud Engineer",                            "dept": "Engineering"},
        {"title": "Audit Associate",                           "dept": "Finance"},
        {"title": "Tax Consultant",                            "dept": "Finance"},
        {"title": "Financial Advisory Analyst",                "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
        {"title": "Technology Risk Manager",                   "dept": "Security"},
    ],
    "netflix": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Senior Software Engineer, Platform",        "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager",                    "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Senior Data Scientist",                     "dept": "Data & Analytics"},
        {"title": "Data Engineer",                             "dept": "Data & Analytics"},
        {"title": "Machine Learning Engineer",                 "dept": "Data & Analytics"},
        {"title": "Product Designer",                          "dept": "Design"},
        {"title": "Site Reliability Engineer",                 "dept": "Infrastructure"},
        {"title": "Senior Security Engineer",                  "dept": "Security"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
        {"title": "Legal Counsel",                             "dept": "Legal"},
    ],
    "uber": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Staff Software Engineer",                   "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager",                    "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Senior Data Scientist",                     "dept": "Data & Analytics"},
        {"title": "Data Engineer",                             "dept": "Data & Analytics"},
        {"title": "Product Designer",                          "dept": "Design"},
        {"title": "Operations Manager",                        "dept": "Operations"},
        {"title": "City Operations Manager",                   "dept": "Operations"},
        {"title": "Account Executive",                         "dept": "Sales"},
        {"title": "Site Reliability Engineer",                 "dept": "Infrastructure"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
    ],
    "airbnb": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Staff Software Engineer",                   "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager",                    "dept": "Product"},
        {"title": "Product Designer",                          "dept": "Design"},
        {"title": "Senior Product Designer",                   "dept": "Design"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
        {"title": "Analytics Engineer",                        "dept": "Data & Analytics"},
        {"title": "Customer Experience Specialist",            "dept": "Customer Success"},
        {"title": "Trust & Safety Specialist",                 "dept": "Operations"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "Legal Counsel",                             "dept": "Legal"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
    ],
    "shopify": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Staff Software Engineer",                   "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Senior Product Manager",                    "dept": "Product"},
        {"title": "Product Designer",                          "dept": "Design"},
        {"title": "Data Scientist",                            "dept": "Data & Analytics"},
        {"title": "Analytics Engineer",                        "dept": "Data & Analytics"},
        {"title": "Account Executive, Enterprise",             "dept": "Sales"},
        {"title": "Merchant Success Manager",                  "dept": "Customer Success"},
        {"title": "Customer Support Specialist",               "dept": "Customer Success"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
    ],
    "honeywell": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Senior Software Engineer",                  "dept": "Engineering"},
        {"title": "Systems Engineer",                          "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Program Manager, NPI",                      "dept": "Program Management"},
        {"title": "Manufacturing Engineer",                    "dept": "Manufacturing"},
        {"title": "Senior Manufacturing Engineer",             "dept": "Manufacturing"},
        {"title": "Process Engineer",                          "dept": "Manufacturing"},
        {"title": "Account Manager",                           "dept": "Sales"},
        {"title": "Solutions Consultant",                      "dept": "Sales"},
        {"title": "Professional Services Engineer",            "dept": "Professional Services"},
        {"title": "Field Service Engineer",                    "dept": "Professional Services"},
        {"title": "Supply Chain Manager",                      "dept": "Operations"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
        {"title": "HR Business Partner",                       "dept": "People & HR"},
        {"title": "Research Scientist",                        "dept": "Research"},
    ],
    "datalogic": [
        {"title": "Software Engineer",                         "dept": "Engineering"},
        {"title": "Firmware Engineer",                         "dept": "Engineering"},
        {"title": "Hardware Engineer",                         "dept": "Engineering"},
        {"title": "Product Manager",                           "dept": "Product"},
        {"title": "Technical Program Manager",                 "dept": "Program Management"},
        {"title": "Manufacturing Engineer",                    "dept": "Manufacturing"},
        {"title": "Quality Engineer",                          "dept": "Manufacturing"},
        {"title": "Account Manager",                           "dept": "Sales"},
        {"title": "Channel Sales Manager",                     "dept": "Sales"},
        {"title": "Field Application Engineer",                "dept": "Professional Services"},
        {"title": "Professional Services Engineer",            "dept": "Professional Services"},
        {"title": "Technical Support Engineer",                "dept": "Customer Success"},
        {"title": "Supply Chain Analyst",                      "dept": "Operations"},
        {"title": "Financial Analyst",                         "dept": "Finance"},
    ],
}

def lookup_known_roles(company: str) -> list[dict]:
    cl = company.lower()
    for key, roles in KNOWN_ROLES.items():
        if key in cl or cl.startswith(key):
            log.info("Known roles match: '%s'", key)
            return [{"title": r["title"], "dept": r["dept"],
                     "_score": 10, "_source": "known_db"} for r in roles]
    return []


# ─── Synthetic fallback ───────────────────────────────────────────────────────

SYNTHETIC_ROLES_BY_DEPT: dict[str, list[dict]] = {
    "Engineering":      [{"title": "Senior Software Engineer", "level": "L5"},
                         {"title": "Software Engineer",        "level": "L4"},
                         {"title": "Engineering Manager",      "level": "Manager"}],
    "Product":          [{"title": "Senior Product Manager",   "level": "L5"},
                         {"title": "Product Manager",          "level": "L4"}],
    "Data & Analytics": [{"title": "Senior Data Scientist",    "level": "L5"},
                         {"title": "Data Analyst",             "level": "L4"}],
    "Design":           [{"title": "Senior UX Designer",       "level": "L5"},
                         {"title": "Product Designer",         "level": "L4"}],
    "Sales":            [{"title": "Senior Account Executive", "level": "L5"},
                         {"title": "Account Executive",        "level": "L4"},
                         {"title": "Sales Development Rep",    "level": "L3"}],
    "Marketing":        [{"title": "Senior Marketing Manager", "level": "L5"},
                         {"title": "Marketing Manager",        "level": "L4"}],
    "Customer Success": [{"title": "Senior CSM",               "level": "L5"},
                         {"title": "Customer Success Manager", "level": "L4"}],
    "Finance":          [{"title": "Senior Financial Analyst", "level": "L5"},
                         {"title": "Financial Analyst",        "level": "L4"}],
    "People & HR":      [{"title": "Senior Recruiter",         "level": "L5"},
                         {"title": "HR Business Partner",      "level": "L5"}],
    "Operations":       [{"title": "Senior Operations Manager","level": "L5"},
                         {"title": "Operations Analyst",       "level": "L4"}],
    "Infrastructure":   [{"title": "Senior DevOps Engineer",   "level": "L5"},
                         {"title": "Site Reliability Engineer", "level": "L4"}],
    "Security":         [{"title": "Senior Security Engineer", "level": "L5"},
                         {"title": "Security Analyst",         "level": "L4"}],
    "Research":         [{"title": "Research Scientist",       "level": "L5"},
                         {"title": "Senior Research Scientist","level": "L7 / Staff"}],
    "Legal":            [{"title": "Senior Counsel",           "level": "Director"},
                         {"title": "Legal Operations Manager", "level": "Manager"}],
    "IT":               [{"title": "IT Engineer",                        "level": "L4"},
                         {"title": "Systems Administrator",              "level": "L4"}],
    "Program Management":[{"title": "Senior Technical Program Manager",  "level": "L5"},
                           {"title": "Technical Program Manager",        "level": "L4"},
                           {"title": "Senior Program Manager",           "level": "L5"}],
    "Manufacturing":    [{"title": "Senior Manufacturing Engineer",      "level": "L5"},
                         {"title": "Manufacturing Engineer",             "level": "L4"},
                         {"title": "Process Engineer",                   "level": "L4"}],
    "Professional Services": [{"title": "Senior Solutions Consultant",   "level": "L5"},
                               {"title": "Implementation Engineer",      "level": "L4"},
                               {"title": "Professional Services Engineer","level": "L4"}],
}

def synthetic_roles(dept_names: list[str], company: str) -> list[dict]:
    result = []
    for dept in dept_names:
        templates = SYNTHETIC_ROLES_BY_DEPT.get(dept, SYNTHETIC_ROLES_BY_DEPT["Engineering"])
        for t in templates:
            result.append({"title": t["title"], "dept": dept,
                            "_score": 0, "_source": "synthetic"})
    log.info("Synthetic fallback: %d roles", len(result))
    return result


# ─── Normalise a raw job title ────────────────────────────────────────────────

_STRIP_SUFFIXES = re.compile(
    r"\s*(–|-|—|/|\|)?\s*(remote|hybrid|onsite|full.time|part.time|contract|"
    r"urgent|new|featured|easy apply|\d+\+? years?|₹|\$|€|£|annual|salary).*$",
    re.IGNORECASE,
)
_GENERIC_RE = re.compile(
    r"^(jobs?|careers?|apply|new|featured|easy|we're hiring|now hiring|"
    r"openings?|opportunities?|team)\s*$",
    re.IGNORECASE,
)

def normalise_title(raw: str, company: str) -> Optional[str]:
    t = clean(raw)
    # Strip company name from end
    t = re.sub(rf"\s*[-|–—@]\s*{re.escape(company)}\s*$", "", t, flags=re.IGNORECASE).strip()
    t = _STRIP_SUFFIXES.sub("", t).strip()
    if len(t) < 4 or len(t) > 80:
        return None
    if _GENERIC_RE.match(t):
        return None
    if not re.search(r"[a-zA-Z]{3}", t):
        return None
    return t


# ─── Supabase dept lookup ─────────────────────────────────────────────────────

def fetch_departments(company_id: str, auth_token: str) -> list[dict]:
    """Return [{id, name}] for existing departments of this company."""
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon_key     = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    api_key      = service_key or anon_key
    bearer       = service_key or auth_token

    if not supabase_url or not bearer:
        return []
    try:
        r = requests.get(
            f"{supabase_url}/rest/v1/company_departments",
            headers={"apikey": api_key, "Authorization": f"Bearer {bearer}"},
            params={"company_id": f"eq.{company_id}", "select": "id,name"},
            timeout=8,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning("Dept fetch failed: %s", e)
        return []


def match_dept_id(dept_name: str, db_depts: list[dict]) -> Optional[str]:
    """Fuzzy match dept_name to existing DB departments."""
    dn = dept_name.lower()
    # Exact
    for d in db_depts:
        if d["name"].lower() == dn:
            return d["id"]
    # Substring
    for d in db_depts:
        if dn in d["name"].lower() or d["name"].lower() in dn:
            return d["id"]
    # First-word match
    for d in db_depts:
        if dn.split()[0] in d["name"].lower():
            return d["id"]
    return None


# ─── Content index: pool job descriptions by department ──────────────────────
# Pooling by dept (not exact title) lets curated roles benefit from scraped JDs
# for the same department. e.g. "Software Engineer" gets the pooled text from all
# scraped Engineering JDs → real company-specific tools/processes extracted.

def _build_dept_content_pool(raw_list: list[dict]) -> dict[str, str]:
    """
    Return {dept_name: concatenated_job_description_text} for all roles that
    have scraped content (_content field). Content is pooled per department so
    that metadata extraction gets a rich signal even for curated title entries.
    """
    pool: dict[str, list[str]] = {}
    for r in raw_list:
        content = r.get("_content", "")
        if content and len(content) > 100:
            dept = r.get("dept", "")
            if dept:
                pool.setdefault(dept, []).append(content)
    # Concatenate up to 5 JDs per dept (enough signal, not too slow to process)
    return {dept: " ".join(texts[:5]) for dept, texts in pool.items()}


# ─── Main orchestrator ────────────────────────────────────────────────────────

def scrape_roles(company: str, website: str, timeout: int = DEFAULT_TIMEOUT,
                 company_id: str = "", auth_token: str = "") -> list[dict]:
    sess = Session(timeout=timeout)
    log.info("=== Scraping roles for: %s (%s) ===", company, website)

    # Fetch existing departments for dept_id linking
    db_depts: list[dict] = []
    if company_id and auth_token:
        db_depts = fetch_departments(company_id, auth_token)
        log.info("DB departments loaded: %d", len(db_depts))

    # ── Phase 1: Collect raw role entries (title + optional job content) ──────
    raw_titles: list[dict] = []

    # Tier 0: Curated known roles (titles only — content enriched below via ATS)
    known = lookup_known_roles(company)
    if known:
        raw_titles.extend(known)
        log.info("Tier 0 curated: %d roles", len(raw_titles))

    # Tier 1: Greenhouse Jobs API (title + full job description)
    try:
        gh_roles = scrape_greenhouse(sess, company)
        for r in gh_roles:
            nt = normalise_title(r["title"], company)
            if nt:
                raw_titles.append({**r, "title": nt})
    except Exception as e:
        log.warning("Greenhouse failed: %s", e)

    # Tier 2: Workday ATS (Fortune 500s — Apple, Google, Netflix, Deloitte, etc.)
    try:
        wd_roles = scrape_workday(sess, company)
        for r in wd_roles:
            nt = normalise_title(r["title"], company)
            if nt:
                raw_titles.append({**r, "title": nt})
        if wd_roles:
            log.info("Workday added %d roles", len(wd_roles))
    except Exception as e:
        log.warning("Workday failed: %s", e)

    # Tier 3: Lever Jobs API (title + full job description)
    if len(raw_titles) < 10:
        try:
            lv_roles = scrape_lever(sess, company)
            for r in lv_roles:
                nt = normalise_title(r["title"], company)
                if nt:
                    raw_titles.append({**r, "title": nt})
        except Exception as e:
            log.warning("Lever failed: %s", e)

    # Tier 4: SmartRecruiters API (Zendesk, Atlassian, Cloudflare, etc.)
    if len(raw_titles) < 10:
        try:
            sr_roles = scrape_smartrecruiters(sess, company)
            for r in sr_roles:
                nt = normalise_title(r["title"], company)
                if nt:
                    raw_titles.append({**r, "title": nt})
        except Exception as e:
            log.warning("SmartRecruiters failed: %s", e)

    # Tier 5: Ashby ATS (Linear, Vercel, Rippling, Brex, etc.)
    if len(raw_titles) < 10:
        try:
            ab_roles = scrape_ashby(sess, company)
            for r in ab_roles:
                nt = normalise_title(r["title"], company)
                if nt:
                    raw_titles.append({**r, "title": nt})
        except Exception as e:
            log.warning("Ashby failed: %s", e)

    # Tier 6: Indeed with job detail content (slower but gets description text)
    if len(raw_titles) < 8:
        try:
            indeed_roles = scrape_indeed_with_content(sess, company)
            for r in indeed_roles:
                nt = normalise_title(r["title"], company)
                if nt:
                    raw_titles.append({**r, "title": nt})
        except Exception as e:
            log.warning("Indeed with content failed: %s", e)

    # Tier 7: Indeed titles only (fast fallback)
    if len(raw_titles) < 5:
        try:
            for t in scrape_indeed(sess, company):
                nt = normalise_title(t, company)
                if nt:
                    raw_titles.append({"title": nt, "dept": infer_dept_name(nt),
                                       "_score": 3, "_source": "indeed"})
        except Exception as e:
            log.warning("Indeed failed: %s", e)

    # Tier 8: Company careers page
    if len(raw_titles) < 5:
        try:
            for t in scrape_company_careers(sess, website, company):
                nt = normalise_title(t, company)
                if nt:
                    raw_titles.append({"title": nt, "dept": infer_dept_name(nt),
                                       "_score": 2, "_source": "careers_page"})
        except Exception as e:
            log.warning("Careers page failed: %s", e)

    # Tier 9: Yahoo search (titles only)
    if len(raw_titles) < 5:
        try:
            for t in scrape_yahoo_jobs(sess, company):
                nt = normalise_title(t, company)
                if nt:
                    raw_titles.append({"title": nt, "dept": infer_dept_name(nt),
                                       "_score": 1, "_source": "yahoo_search"})
        except Exception as e:
            log.warning("Yahoo jobs search failed: %s", e)

    # Synthetic fallback
    if len(raw_titles) < 4:
        dept_names = [d["name"] for d in db_depts] or ["Engineering", "Product", "Sales", "Marketing"]
        raw_titles.extend(synthetic_roles(dept_names, company))

    # ── Phase 2: Build dept content pool from scraped job descriptions ───────
    # Pools all scraped JD text per department so curated roles also benefit.
    dept_pool = _build_dept_content_pool(raw_titles)
    log.info("Content pool: %d departments with scraped JD text", len(dept_pool))

    # ── Phase 3: Deduplicate by normalised title ──────────────────────────────
    raw_titles.sort(key=lambda x: x.get("_score", 0), reverse=True)
    seen_titles: set[str] = set()
    deduped: list[dict] = []
    for r in raw_titles:
        key = re.sub(r"[^a-z0-9]", "", r["title"].lower())[:30]
        if key not in seen_titles and key:
            seen_titles.add(key)
            deduped.append(r)

    # ── Phase 4: Build final role objects, merging scraped + template data ────
    result: list[dict] = []
    sort_counter = 0
    for r in deduped[:30]:
        title     = r["title"]
        dept_name = r.get("dept") or infer_dept_name(title)
        level     = infer_level(title)
        template  = get_template(dept_name, level)
        dept_id   = match_dept_id(dept_name, db_depts)

        # Skip if we can't link to a real department
        if db_depts and not dept_id:
            log.debug("Skipping '%s' — no matching dept '%s'", title, dept_name)
            continue

        # Enrich metadata: use this role's own content first, then dept pool
        own_content  = r.get("_content", "")
        dept_content = dept_pool.get(dept_name, "")
        # Prefer own content (most specific); fall back to dept pool
        content      = own_content if len(own_content) > 100 else dept_content
        enriched     = enrich_role_metadata(
            {**r, "_content": content, "_level": level, "dept": dept_name},
            template,
        )

        result.append({
            "title":               title,
            "level":               level,
            "department_id":       dept_id or "",
            "department_name":     dept_name,
            "tools":               enriched["tools"],
            "skills":              enriched["skills"],
            "processes":           enriched["processes"],
            "interview_questions": enriched["interview_questions"],
            "keywords":            enriched["keywords"],
            "sort_order":          sort_counter,
            "_source":             r.get("_source", "unknown"),
        })
        sort_counter += 1

    log.info("Final roles: %d", len(result))
    return result


# ─── Supabase writer ──────────────────────────────────────────────────────────

def push_roles(company_id: str, roles: list[dict], auth_token: str) -> bool:
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    anon_key     = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    service_key  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bearer       = service_key or auth_token
    api_key      = service_key or anon_key

    if not supabase_url or not bearer:
        log.warning("Supabase credentials missing — skipping write")
        return False

    headers = {
        "apikey":        api_key,
        "Authorization": f"Bearer {bearer}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }
    table = f"{supabase_url}/rest/v1/company_roles"
    try:
        requests.delete(table, headers=headers,
                        params={"company_id": f"eq.{company_id}"}, timeout=10).raise_for_status()
        rows = [
            {
                "company_id":          company_id,
                "department_id":       r["department_id"],
                "title":               r["title"],
                "level":               r["level"],
                "tools":               r["tools"],
                "skills":              r["skills"],
                "processes":           r["processes"],
                "interview_questions": r["interview_questions"],
                "keywords":            r["keywords"],
                "sort_order":          r["sort_order"],
            }
            for r in roles if r.get("department_id")  # only write rows with valid dept
        ]
        if not rows:
            log.warning("No valid rows to write (all missing department_id)")
            return False
        requests.post(table, headers=headers, json=rows, timeout=15).raise_for_status()
        log.info("Pushed %d roles for company %s", len(rows), company_id)
        return True
    except Exception as e:
        log.error("Supabase write error: %s", e)
        return False


def revalidate_company_profile(app_url: str, company_id: str) -> None:
    try:
        requests.post(f"{app_url.rstrip('/')}/api/revalidate-company",
                      json={"companyId": company_id}, timeout=8)
        log.info("Revalidation sent for %s", company_id)
    except Exception as e:
        log.warning("Revalidation failed (non-fatal): %s", e)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--company",    required=True)
    parser.add_argument("--website",    required=True)
    parser.add_argument("--timeout",    type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--company-id", default=None)
    parser.add_argument("--auth-token", default=None)
    parser.add_argument("--app-url",    default=None)
    args = parser.parse_args()

    company = args.company.strip()
    website = args.website.strip()
    if not company or not website:
        print(json.dumps({"error": "company and website are required"}))
        sys.exit(1)

    roles = scrape_roles(
        company, website,
        timeout=args.timeout,
        company_id=args.company_id or "",
        auth_token=args.auth_token or "",
    )

    if not roles:
        print(json.dumps({"error": f"No roles found for {company}"}))
        sys.exit(2)

    if args.company_id:
        written = push_roles(args.company_id, roles, args.auth_token or "")
        if written and args.app_url:
            revalidate_company_profile(args.app_url, args.company_id)
        print(json.dumps({"count": len(roles), "written": written}, ensure_ascii=False))
    else:
        out = [{k: v for k, v in r.items() if not k.startswith("_")} for r in roles]
        print(json.dumps(out, ensure_ascii=False, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
