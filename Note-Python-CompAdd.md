## Python add company
Variables:
Here are all the variables the scraper outputs:

  ┌─────────────┬──────────┬───────────────────────────────────────────────────┬────────────────────────────────────┐
  │    Field    │   Type   │                      Example                      │               Source               │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ name        │ string   │ "Apple"                                           │ website                            │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ slug        │ string   │ "apple-inc"                                       │ derived from name                  │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ category    │ string   │ "Consumer electronics Software services Online    │ wikipedia                          │
  │             │          │ services"                                         │                                    │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ description │ string   │ One-sentence summary                              │ wikipedia                          │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ logo_color  │ string   │ "#7C3AED"                                         │ hardcoded default                  │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ employees   │ integer  │ 166000                                            │ wikipedia                          │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ founded     │ integer  │ 1976                                              │ wikipedia                          │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ hq          │ string   │ "Apple Park, Cupertino, California"               │ wikipedia                          │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ valuation   │ string   │ "$3.3T"                                           │ sec_edgar / estimate               │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ revenue     │ string   │ "$416.0B"                                         │ wikipedia / sec_edgar              │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ website     │ string   │ "https://apple.com"                               │ input                              │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ is_hiring   │ boolean  │ true                                              │ website                            │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ tags        │ string[] │ ["Cloud", "Mobile", ...]                          │ website                            │
  ├─────────────┼──────────┼───────────────────────────────────────────────────┼────────────────────────────────────┤
  │ _sources    │ object   │ per-field source map                              │ internal (stripped before API      │
  │             │          │                                                   │ response)                          │
  └─────────────┴──────────┴───────────────────────────────────────────────────┴────────────────────────────────────┘

Scrapper Source:

⏺ Here are all the sources the scraper uses, in priority order:                                                         
                                                                                                                        
  ---                                                                                                                   
  Tier 1 — Wikipedia (WikipediaScraper)                     
                                                                                                                        
  ┌─────────────────────────────────────────┬────────────────────────────────────────────────┐
  │                Endpoint                 │                    Purpose                     │                          
  ├─────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ en.wikipedia.org/w/api.php (opensearch) │ Find the correct article title for the company │
  ├─────────────────────────────────────────┼────────────────────────────────────────────────┤
  │ en.wikipedia.org/wiki/{title}           │ Fetch full article HTML                        │                          
  └─────────────────────────────────────────┴────────────────────────────────────────────────┘                          
                                                                                                                        
  Extracts from the infobox table: employees, revenue, market cap / valuation, founded, headquarters, industry/category 
  Extracts from the lead paragraph: description (first sentence)
                                                                                                                        
  ---                                                       
  Tier 1 — SEC EDGAR (SecEdgarScraper)
                                      
  ┌──────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────┐
  │                     Endpoint                     │                            Purpose                            │  
  ├──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ sec.gov/files/company_tickers.json               │ Find the company's CIK by fuzzy name match against all        │  
  │                                                  │ registered tickers                                            │
  ├──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤  
  │ efts.sec.gov/LATEST/search-index                 │ Fallback CIK lookup via full-text search on 10-K filings      │  
  ├──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤  
  │ data.sec.gov/submissions/CIK{cik}.json           │ Business address (HQ city/state), SIC code → category         │  
  ├──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
  │ data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json │ XBRL financial facts: revenue, employees, public float (used  │  
  │                                                  │ as valuation proxy)                                           │  
  └──────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────┘
                                                                                                                        
  Only works for US public companies (requires an SEC filing).                                                          
   
  ---                                                                                                                   
  Tier 2 — Yahoo Finance (YahooFinanceScraper)              
                                                                                                                        
  ┌────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐
  │                          Endpoint                          │                       Purpose                       │  
  ├────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ finance.yahoo.com                                          │ Prime session cookies                               │
  ├────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ query1/query2.finance.yahoo.com/v1/test/getcrumb           │ Obtain crumb token (required since 2023)            │
  ├────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
  │ query1.finance.yahoo.com/v1/finance/search                 │ Resolve company name → ticker symbol                │
  ├────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤  
  │ query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker} │ revenue (TTM), market cap, enterprise value,        │
  │                                                            │ employees, HQ, industry, description                │  
  └────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘
                                                                                                                        
  Only works for publicly traded companies.                 

  ---
  Tier 3 — Company Website (WebsiteScraper)
                                                                                                                        
  ┌───────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
  │                      Signal                       │                           Purpose                           │   
  ├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤
  │ schema.org/Organization JSON-LD                   │ Structured name, description, foundingDate,                 │
  │                                                   │ numberOfEmployees                                           │
  ├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤   
  │ <meta og:description> / <meta                     │ Fallback description                                        │   
  │ twitter:description>                              │                                                             │   
  ├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤   
  │ First substantial <p> tag                         │ Last-resort description                                     │
  ├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤   
  │ /careers, /jobs, /work-here, /join-us paths       │ is_hiring signal                                            │
  ├───────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────┤   
  │ Full page text keyword matching                   │ tags inference (SaaS, AI/ML, Fintech, Cloud, etc.)          │
  └───────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────┘   
                                                            
  ---                                                                                                                   
  Tier 99 — Fallback Estimator (no network call)            
                                                                                                                        
  Activated only when a field is still empty after all four scrapers complete. Uses 28 industry benchmark tables to
  reverse-engineer missing values:                                                                                      
  - revenue ← employees × revenue_per_employee(industry)    
  - employees ← revenue ÷ revenue_per_employee(industry)                                                                
  - valuation ← revenue × EV/Revenue_multiple(industry), or employees × valuation_per_employee(industry)