import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_callout(doc, title, text, bg_hex="F0FDF4", border_hex="10B981"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.columns[0].width = Inches(6.5)
    
    cell = table.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Left border only
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(f"📌 {title}\n")
    run_title.bold = True
    run_title.font.size = Pt(11)
    run_title.font.color.rgb = RGBColor(16, 120, 80)
    
    run_text = p.add_run(text)
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = RGBColor(50, 60, 70)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def build_document(output_path):
    doc = Document()
    
    # Page setup
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
    # Styles & Colors
    # Primary: #0F172A (Navy/Dark Slate), Accent: #10B981 (Emerald Green), Sub: #475569
    
    # ── COVER / TITLE HEADER ──
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(10)
    title_p.paragraph_format.space_after = Pt(2)
    run_tag = title_p.add_run("MCA SEMESTER 3 — CAPSTONE PROJECT REVIEW")
    run_tag.bold = True
    run_tag.font.size = Pt(11)
    run_tag.font.color.rgb = RGBColor(16, 185, 129) # Emerald
    
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(2)
    h1.paragraph_format.space_after = Pt(4)
    run_h1 = h1.add_run("FoodLens: AI-Powered Personalized Food Safety & Health Risk Assessment Platform")
    run_h1.bold = True
    run_h1.font.size = Pt(22)
    run_h1.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    
    sub = doc.add_paragraph()
    sub.paragraph_format.space_after = Pt(14)
    run_sub = sub.add_run("Comprehensive Technical Documentation, Individual Module Ownership & Presentation Reference Guide")
    run_sub.font.size = Pt(12)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139)
    
    # Divider line
    div = doc.add_paragraph()
    div.paragraph_format.space_after = Pt(12)
    run_div = div.add_run("━" * 58)
    run_div.font.color.rgb = RGBColor(203, 213, 225)
    
    # ── TEAM ALLOCATION SUMMARY TABLE ──
    h2_team = doc.add_heading(level=1)
    h2_team.paragraph_format.space_before = Pt(8)
    h2_team.paragraph_format.space_after = Pt(8)
    r = h2_team.add_run("1. Executive Summary & Team Module Allocation")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    doc.add_paragraph(
        "FoodLens is a personalized dietary decision-support mobile system designed to address the critical gaps in "
        "global food scanning applications. While conventional tools provide generic ratings, FoodLens evaluates food labels "
        "directly against the individual user's chronic health conditions (e.g., Diabetes, Hypertension, Celiac) and allergies "
        "(e.g., Peanuts, Gluten, Dairy) using a mathematically grounded harmonic position-weighting algorithm and Generative AI."
    )
    
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [Inches(1.5), Inches(1.8), Inches(2.2), Inches(1.2)]
    
    headers = ["Team Member", "Email", "Core Module Responsibility", "External Integrations"]
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        hdr_cells[i].paragraphs[0].runs[0].bold = True
        hdr_cells[i].paragraphs[0].runs[0].font.size = Pt(9.5)
        hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(hdr_cells[i], "0F172A")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
        hdr_cells[i].width = widths[i]
        
    members = [
        ("Lekshmi A Nair", "lekshmianair2004@gmail.com", "Module 1: Personalized Health Risk Scoring Engine & Relational Database Architecture", "PDF Health Report Generation (ReportLab)"),
        ("Akhil Alex", "alex462315@gmail.com", "Module 2: Optical Character Recognition (OCR), Label Processing & NLP Pipeline", "Tesseract OCR, OpenCV & Community Crowdsourcing"),
        ("Amal Reghunath", "amalrh654@gmail.com", "Module 3: Real-Time Barcode Scanner, Multi-User Auth & OFF Integration", "Google OAuth 2.0 & Open Food Facts API Proxy"),
        ("Mithul Jacob Manoj", "mithulmanoj12@gmail.com", "Module 4: Mobile UI/UX, AI Explanation, Voice Synthesis & Multi-Channel Sharing", "Google Gemini 3.6-Flash, TTS Engine & QR Sharing"),
    ]
    
    for row_idx, (name, email, core, ext) in enumerate(members):
        row_cells = table.add_row().cells
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for i, val in enumerate([name, email, core, ext]):
            row_cells[i].text = val
            row_cells[i].paragraphs[0].runs[0].font.size = Pt(9)
            row_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(30, 41, 59)
            set_cell_background(row_cells[i], bg)
            set_cell_margins(row_cells[i], top=80, bottom=80, left=100, right=100)
            row_cells[i].width = widths[i]
            
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    # ── SYSTEM ARCHITECTURE ──
    h2_arch = doc.add_heading(level=1)
    h2_arch.paragraph_format.space_before = Pt(14)
    r = h2_arch.add_run("2. System Architecture & Tech Stack")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    doc.add_paragraph(
        "FoodLens is structured as an enterprise-grade 3-tier architecture with clean separation between client-side ingestion, "
        "stateless RESTful backend services, and persistent relational storage:"
    )
    
    doc.add_paragraph(
        "• Mobile Application Tier: Built with React Native 0.86 (TypeScript, New Architecture / TurboModules). "
        "Features hardware camera barcode scanning, camera image capture, interactive SVG gauge rendering, "
        "instant profile switching, and on-device text-to-speech voice output.\n"
        "• Application Server Tier: Built on Django REST Framework (DRF, Python 3.10). Hosts the deterministic scoring engine, "
        "OpenCV/Tesseract OCR pipeline, Open Food Facts proxy, Gemini LLM client, and ReportLab PDF renderer.\n"
        "• Database Tier: MySQL 8.0 ('foodlens_db') with strict foreign key constraints, normalized across health profiles, "
        "conditions, master ingredients, aliases, condition multipliers, scan histories, and community submissions.\n"
        "• External Services: Google Gemini 3.6-Flash for plain-language reasoning, Open Food Facts API for global barcode lookup, "
        "Google OAuth 2.0 for single-tap identity, and Android native TTS for voice accessibility."
    )
    
    # ── MODULE 1 DEEP DIVE: LEKSHMI A NAIR ──
    doc.add_page_break()
    h2_m1 = doc.add_heading(level=1)
    r = h2_m1.add_run("3. Module 1: Scoring Engine & Database Architecture")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    lead_m1 = doc.add_paragraph()
    r_lead = lead_m1.add_run("Owner: Lekshmi A Nair (lekshmianair2004@gmail.com)\nFocus: Mathematical Risk Modeling, Relational Schema & PDF Health Report Engine")
    r_lead.bold = True
    r_lead.font.color.rgb = RGBColor(16, 185, 129)
    
    doc.add_heading("A. Core Responsibilities & Implementation Details", level=2)
    doc.add_paragraph(
        "Lekshmi is responsible for the core decision-making brain of FoodLens. While other food apps use arbitrary black-box scoring, "
        "Lekshmi engineered a transparent, mathematically calibrated health risk scoring engine and designed the MySQL relational database."
    )
    
    doc.add_heading("B. The Mathematical Risk Scoring Formula", level=3)
    doc.add_paragraph(
        "Packaged food ingredients are legally listed in descending order by weight (predominant ingredients first). "
        "The scoring engine reflects this reality through a Harmonic Position-Weighting function:\n\n"
        "1. Position Weight: W_i = 1 / i  (e.g., Position 1 = 1.0, Position 2 = 0.5, Position 3 = 0.33, Position 4 = 0.25...)\n"
        "2. Severity-Aware Condition Adjustment: Each ingredient belongs to a category (sweetener, saturated fat, sodium, preservative). "
        "When a user has a chronic condition (e.g. Diabetes), the multiplier is adjusted by condition severity:\n"
        "   Effective Multiplier = 1 + (Multiplier_Value - 1) * Severity_Weight\n"
        "   (Mild = 0.5, Moderate = 1.0, Severe = 1.5)\n"
        "   Adjusted Risk Score = min(10, Base_Risk * max(Effective_Multipliers))\n"
        "3. Ingredient Impact: Impact_i = Adjusted_Risk_i * W_i\n"
        "4. Raw Score Aggregation: Raw_Score = SUM(Impact_i)\n"
        "5. Normalization to 0–100 Scale: Normalized_Score = min(100, (Raw_Score / 15) * 100)\n"
        "   • 0 – 35: Low Risk (Green)\n"
        "   • 36 – 65: Moderate Risk (Amber)\n"
        "   • 66 – 100: High Risk (Red)\n"
        "6. Allergen Rule: Unconditional trigger. If an ingredient matches any allergen on the profile, an immediate High-Risk alert is flagged regardless of score."
    )
    
    doc.add_heading("C. Database Architecture & Relational Schema", level=3)
    doc.add_paragraph(
        "Designed and normalized 8 relational tables in MySQL:\n"
        "• health_healthprofile: Multi-user family profiles (name, relation, age, gender, height, weight, user_id).\n"
        "• health_healthcondition: Chronic conditions linked to profile (condition_name, severity).\n"
        "• health_allergy: Specific allergens linked to profile (allergen_name).\n"
        "• scoring_ingredient: 200+ canonical ingredients with base risk scores (0-10) and allergen flags.\n"
        "• scoring_ingredientalias: Synonym mapping (e.g., 'HFCS', 'Corn Syrup Solids' -> High Fructose Corn Syrup).\n"
        "• scoring_conditionmultiplier: Category-to-condition multipliers (e.g. Sweetener x Diabetes = 1.50x).\n"
        "• scoring_scoredresult & scoring_scoredingredientdetail: Immutable scan result audit trail."
    )
    
    doc.add_heading("D. External Feature: ReportLab PDF Export Service", level=3)
    doc.add_paragraph(
        "Engineered the multi-section PDF health report generator (scoring/pdf_service.py). "
        "Generates publication-quality downloadable health reports featuring the user's profile summary, color-coded risk badge, "
        "full ingredient table with position impacts, allergen trigger warnings, and Gemini AI health insights."
    )
    
    add_callout(
        doc,
        "Lekshmi's Presentation Pitch for Review",
        "\"My module ensures FoodLens is clinically and mathematically grounded. A chocolate bar with sugar at position 1 gives a raw score "
        "of 12+ for a diabetic, immediately pushing it into the 80/100 High Risk bracket, whereas for a healthy profile it scores moderate. "
        "I also designed the MySQL database normalizing family profiles and engineered the ReportLab PDF export engine.\""
    )
    
    # ── MODULE 2 DEEP DIVE: AKHIL ALEX ──
    doc.add_page_break()
    h2_m2 = doc.add_heading(level=1)
    r = h2_m2.add_run("4. Module 2: OCR & NLP Processing Pipeline")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    lead_m2 = doc.add_paragraph()
    r_lead = lead_m2.add_run("Owner: Akhil Alex (alex462315@gmail.com)\nFocus: Computer Vision, Optical Character Recognition, NLP Tokenization & Crowdsourcing")
    r_lead.bold = True
    r_lead.font.color.rgb = RGBColor(16, 185, 129)
    
    doc.add_heading("A. Core Responsibilities & Implementation Details", level=2)
    doc.add_paragraph(
        "Akhil engineered the fallback computer vision pipeline that empowers FoodLens to analyze products that have no barcode or "
        "do not exist in global food databases (local Indian bakeries, regional snacks, loose packaging)."
    )
    
    doc.add_heading("B. Optical Character Recognition (OCR) Pipeline", level=3)
    doc.add_paragraph(
        "1. Image Acquisition: User photographs the physical ingredient label using camera-kit or uploads from gallery.\n"
        "2. OpenCV Image Preprocessing: Grayscale conversion, Otsu thresholding, noise reduction, and contrast enhancement.\n"
        "3. Tesseract OCR Engine: Runs on the server (scoring/ocr_service.py) to extract raw text characters.\n"
        "4. Gemini AI Text Cleanup: Uses a strict-fidelity prompt (explanations/llm_service.py: clean_ocr_text) "
        "to fix character misrecognitions (e.g. 'sugr' -> 'sugar', 'paim oi1' -> 'palm oil') without hallucinating new ingredients.\n"
        "5. Review & Edit Screen: Presents the extracted text to the user in OCRReviewScreen.tsx so they can verify before scoring."
    )
    
    doc.add_heading("C. NLP Tokenization & Multi-Tier Matching Engine", level=3)
    doc.add_paragraph(
        "Implemented in scoring/engine.py:\n"
        "• Regex Token Cleaning: Strips percentages ('Sugar (88%)' -> 'Sugar'), brackets, asterisks, and noise.\n"
        "• Tier 1 (Exact Canonical Match): Case-insensitive match against Ingredient.name.\n"
        "• Tier 2 (Alias Match): Case-insensitive match against IngredientAlias.alias_name.\n"
        "• Tier 3 (Parenthetical Extraction): Extracts embedded ingredients like 'Color (Caramel E150d)' -> 'Caramel E150d'.\n"
        "• O(1) Pre-fetched Hash Lookups: Bulk-loads ingredients and aliases into memory to prevent N+1 database queries."
    )
    
    doc.add_heading("D. External Feature: Community-Sourced Database", level=3)
    doc.add_paragraph(
        "Built the crowdsourced product ingestion system. When a product barcode or OCR text is not in the database, "
        "users can submit the product name, brand, barcode, ingredients, and nutrition via CommunitySubmitScreen. "
        "Submissions enter the CommunitySubmission table as 'pending'. In Django Admin, staff review and approve submissions with 1 click, "
        "which immediately activates them in barcode lookup and personalized risk scoring for all users."
    )
    
    add_callout(
        doc,
        "Akhil's Presentation Pitch for Review",
        "\"Global databases fail for 60% of Indian packaged foods. My module bridges this gap: users simply photograph the label. "
        "My OpenCV and Tesseract pipeline extracts the text, Gemini cleans OCR typos, and my NLP matching engine maps each token to our "
        "ingredient database. If an item is brand new, users submit it to our crowdsourced community database for admin verification.\""
    )
    
    # ── MODULE 3 DEEP DIVE: AMAL REGHUNATH ──
    doc.add_page_break()
    h2_m3 = doc.add_heading(level=1)
    r = h2_m3.add_run("5. Module 3: Barcode Scanner & Authentication")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    lead_m3 = doc.add_paragraph()
    r_lead = lead_m3.add_run("Owner: Amal Reghunath (amalrh654@gmail.com)\nFocus: Hardware Scanning, Open Food Facts Proxy, OAuth 2.0 Security & Identity")
    r_lead.bold = True
    r_lead.font.color.rgb = RGBColor(16, 185, 129)
    
    doc.add_heading("A. Core Responsibilities & Implementation Details", level=2)
    doc.add_paragraph(
        "Amal is responsible for real-time camera barcode detection, proxying the global Open Food Facts API, "
        "and managing the end-to-end user authentication and account security lifecycle."
    )
    
    doc.add_heading("B. Real-Time Barcode Scanner", level=3)
    doc.add_paragraph(
        "Implemented in ScanScreen.tsx using react-native-camera-kit:\n"
        "• Scans EAN-13, UPC-A, and EAN-8 barcodes at 60 fps.\n"
        "• Features visual scan laser animation, green success bounding box, and instant haptic feedback.\n"
        "• Debounced scan handler prevents duplicate triggers while fetching product metadata."
    )
    
    doc.add_heading("C. Open Food Facts API Proxy & Merging", level=3)
    doc.add_paragraph(
        "Implemented in products/views.py:\n"
        "• Proxies Open Food Facts (OFF) to protect client IP and bypass mobile CORS limitations.\n"
        "• Extracts product name, brand, high-res image, ingredients text, nutriscore, and macronutrients.\n"
        "• Intelligent Community Merge: If an approved community submission exists for a barcode, it merges missing ingredients "
        "directly into the OFF response, ensuring complete ingredient analysis."
    )
    
    doc.add_heading("D. Dual Authentication & Account Security", level=3)
    doc.add_paragraph(
        "• Standard Token Authentication: Django REST Framework TokenAuth with Argon2/PBKDF2 password hashing.\n"
        "• Google OAuth 2.0 Sign-In: Native Google account picker (@react-native-google-signin/google-signin). "
        "Verifies Google ID tokens server-side with google-auth library and creates/authenticates user without storing Google passwords.\n"
        "• Timed Password Peek: Eye icon provides a 10-second temporary reveal for user convenience.\n"
        "• Forgot Password Flow: 6-digit expiring email OTP verification with password reset.\n"
        "• Edit Username Feature: In-app modal with regex validation, length checks, and case-insensitive uniqueness verification."
    )
    
    add_callout(
        doc,
        "Amal's Presentation Pitch for Review",
        "\"My module handles the primary user entry point: point the camera at any packaged barcode and within milliseconds "
        "it detects the EAN-13 code, proxies Open Food Facts, merges verified community data, and feeds into the scoring pipeline. "
        "I also built the complete authentication system supporting both Google OAuth 2.0 and token authentication with OTP recovery.\""
    )
    
    # ── MODULE 4 DEEP DIVE: MITHUL JACOB MANOJ ──
    doc.add_page_break()
    h2_m4 = doc.add_heading(level=1)
    r = h2_m4.add_run("6. Module 4: UI/UX, AI Explanation, Voice & Sharing")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    lead_m4 = doc.add_paragraph()
    r_lead = lead_m4.add_run("Owner: Mithul Jacob Manoj (mithulmanoj12@gmail.com)\nFocus: Frontend Design System, Gemini Generative AI, Text-to-Speech & Multi-Channel Sharing")
    r_lead.bold = True
    r_lead.font.color.rgb = RGBColor(16, 185, 129)
    
    doc.add_heading("A. Core Responsibilities & Implementation Details", level=2)
    doc.add_paragraph(
        "Mithul is responsible for the user-facing experience, turning complex chemical ingredient scores into "
        "intuitive visual dashboards, natural-sounding AI explanations, spoken voice audio, and shareable reports."
    )
    
    doc.add_heading("B. UI/UX Design System & Dynamic Gauges", level=3)
    doc.add_paragraph(
        "• HealthRiskScoreGauge: Custom animated SVG circular gauge with dynamic needle interpolation and risk-gradient coloring.\n"
        "• Instant Multi-User Profile Switcher: Horizontal pill chips ('Myself', 'Amma', 'Dad') that instantly re-evaluate "
        "the product against different health conditions and allergies without re-scanning.\n"
        "• Risk Badge & Allergen Banners: Color-coded visual alerts (Low=Green, Moderate=Yellow, High=Red) with pulsing warning cards.\n"
        "• Side-by-Side Product Comparison: Head-to-head comparison screen displaying two products' calories, sugar, fat, and risk scores."
    )
    
    doc.add_heading("C. Generative AI Explanation (Google Gemini 3.6-Flash)", level=3)
    doc.add_paragraph(
        "Implemented in explanations/llm_service.py:\n"
        "• Strict-Fidelity Prompt: Constrains Gemini to act strictly as an empathetic health translator. "
        "It is explicitly forbidden from making up medical advice, inventing ingredient facts, or changing scores.\n"
        "• Multi-Model Resilient Fallback: Automatically falls back across active Google endpoints (gemini-3.6-flash -> gemini-3.8-flash -> gemini-3.5-flash).\n"
        "• Caching & Feedback: Explanations are cached in MySQL (explanations_explanation) to avoid duplicate API costs, "
        "with thumbs up/down user feedback tracking."
    )
    
    doc.add_heading("D. Text-to-Speech (TTS) Voice Synthesis", level=3)
    doc.add_paragraph(
        "• Built using @mhpdev/react-native-speech specifically for React Native's New Architecture (TurboModules).\n"
        "• 100% on-device local speech synthesis using Android's native Google Speech Engine (zero cloud latency, works offline).\n"
        "• One-tap audio playback on ProductResultScreen: Reads out the product name, personalized risk level, allergen warning, "
        "and condition impact aloud for accessibility and convenience."
    )
    
    doc.add_heading("E. Multi-Channel Report Sharing", level=3)
    doc.add_paragraph(
        "• Native Share: Instant text summary export to WhatsApp, SMS, or Telegram.\n"
        "• QR Code Generator: Renders scannable QR codes supporting both offline text card mode and public web report URLs.\n"
        "• Cumulative Nutrition Tracker: Aggregates daily calories, sugars, fats, and sodium across all user scans with visual progress bars."
    )
    
    doc.add_heading("F. Dynamic Light & Dark Mode (Theme Engine)", level=3)
    doc.add_paragraph(
        "• Engineered a reactive ThemeProvider and custom ThemeContext persisting choices in AsyncStorage (@foodlens_theme_mode).\n"
        "• High-Contrast Color Palettes: Tailored Light Mode (clean slate, crisp white cards) and sleek Dark Mode (deep slate #0F172A background, #1E293B elevated cards, #F8FAFC text, #334155 borders).\n"
        "• Interactive Settings Menu: Three-option segmented control (☀️ Light / 🌙 Dark / ⚙️ Auto) allowing real-time switching without app reload.\n"
        "• Strict Contrast Compliance: All text, icons, gauges, cards, modals, and tab navigation dynamically re-theme ensuring 100% visibility in both modes."
    )
    
    add_callout(
        doc,
        "Mithul's Presentation Pitch for Review",
        "\"My module bridges the gap between raw data and human understanding. Instead of confusing numbers, users see an interactive "
        "SVG gauge, get a personalized 1-paragraph explanation from Gemini AI, and can even tap 'Listen' to hear the risk report read aloud. "
        "I also engineered the dynamic Light and Dark mode engine with seamless toggle in Settings, the QR code sharing system, and the healthier alternative comparison engine.\""
    )
    
    # ── LIVE DEMO & REVIEW SCRIPT ──
    doc.add_page_break()
    h2_demo = doc.add_heading(level=1)
    r = h2_demo.add_run("7. Live Demonstration Flow for Review")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    doc.add_paragraph("Follow this exact step-by-step sequence during tomorrow's live demonstration to showcase all 4 team members' work smoothly:")
    
    demo_steps = [
        ("Step 1", "Authentication (Amal)", "Log in using Google Sign-In with the native account picker. Show timed password peek and settings."),
        ("Step 2", "Multi-User Profiles (Lekshmi)", "Navigate to Health Profiles. Show 'Myself' (Healthy) and 'Amma' (Diabetes + Hypertension + Peanut Allergy) in MySQL."),
        ("Step 3", "Barcode Scan (Amal)", "Scan a packaged product (e.g. Coca-Cola or Lays). Show instant barcode detection and Open Food Facts lookup."),
        ("Step 4", "Scoring Engine (Lekshmi)", "Highlight the 0-100 score gauge. Switch profile from 'Myself' to 'Amma' — watch score jump from Moderate to High due to sugar & diabetes!"),
        ("Step 5", "AI Explanation (Mithul)", "Scroll to AI Explanation card. Show Gemini's real-time personalized reasoning mentioning 'Amma' and her diabetes."),
        ("Step 6", "Text-to-Speech Voice (Mithul)", "Tap the 🔊 'Listen' button on the score card — let the examiner hear FoodLens speak the risk warning aloud!"),
        ("Step 7", "OCR Label Scanning (Akhil)", "Switch to OCR tab. Photograph a regional bakery product. Show text extraction, Gemini typo cleaning, and review screen."),
        ("Step 8", "Community Submission (Akhil)", "For an unrecognized product, open Community Submit, submit ingredients, and show approval in Django Admin."),
        ("Step 9", "Healthier Alternatives (Mithul)", "Tap 'Compare Head-to-Head' on a recommended safer alternative to view side-by-side nutrition."),
        ("Step 10", "Report Sharing & PDF (Lekshmi/Mithul)", "Tap 'Export PDF' to view the ReportLab health report. Open QR code share modal to demonstrate cross-device sharing."),
    ]
    
    demo_table = doc.add_table(rows=1, cols=3)
    demo_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    demo_table.autofit = False
    d_widths = [Inches(1.0), Inches(2.2), Inches(3.3)]
    
    for i, t in enumerate(["Step", "Feature & Presenter", "Action to Demonstrate"]):
        cell = demo_table.rows[0].cells[i]
        cell.text = t
        cell.paragraphs[0].runs[0].bold = True
        cell.paragraphs[0].runs[0].font.size = Pt(9.5)
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(cell, "0F172A")
        set_cell_margins(cell, top=100, bottom=100, left=100, right=100)
        cell.width = d_widths[i]
        
    for idx, (st, pres, act) in enumerate(demo_steps):
        row = demo_table.add_row().cells
        bg = "F8FAFC" if idx % 2 == 1 else "FFFFFF"
        for i, val in enumerate([st, pres, act]):
            row[i].text = val
            row[i].paragraphs[0].runs[0].font.size = Pt(9)
            row[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(30, 41, 59)
            set_cell_background(row[i], bg)
            set_cell_margins(row[i], top=70, bottom=70, left=100, right=100)
            row[i].width = d_widths[i]
            
    # ── EXAMINER Q&A CHEAT SHEET ──
    doc.add_page_break()
    h2_qa = doc.add_heading(level=1)
    r = h2_qa.add_run("8. Review Viva / Q&A Preparation Sheet")
    r.font.color.rgb = RGBColor(15, 23, 42)
    
    qa_list = [
        ("Q1: Why does FoodLens use position weighting instead of simple average risk?",
         "A1 (Lekshmi): Food regulatory bodies (FSSAI/FDA) mandate listing ingredients in descending order by weight. "
         "A toxin or high sugar at Position 1 is vastly more dangerous than at Position 15. The harmonic weighting W_i = 1/i mathematically captures this dosage reality."),
        
        ("Q2: Why not let Gemini or an LLM calculate the health score directly?",
         "A2 (Mithul): LLMs suffer from non-deterministic hallucinations, numeric inconsistency, and high latency. "
         "FoodLens enforces a strict architectural boundary: scoring is 100% deterministic code in Python. Gemini is used strictly for natural language explanation."),
         
        ("Q3: How does OCR handle poor quality or distorted labels on curved bottles?",
         "A3 (Akhil): We apply OpenCV adaptive Otsu thresholding and contrast normalization before passing the image to Tesseract. "
         "Then, Gemini cleans character misrecognitions (e.g. 'sugr' -> 'sugar') before tokenization."),
         
        ("Q4: What if an approved community submission has an ingredient not in your database?",
         "A4 (Akhil/Lekshmi): In Django Admin, staff can review community submissions and add new ingredients to the master Ingredient table with their base risk score (0-10) and category. Unmatched tokens contribute 0 risk until cataloged."),
         
        ("Q5: Does Google Sign-In store user passwords in your database?",
         "A5 (Amal): No. Google OAuth uses secure token exchange. The mobile app receives a Google ID token, sends it to our backend, which verifies the token directly with Google APIs and creates a secure DRF session token."),
         
        ("Q6: Does Text-to-Speech require an active internet connection?",
         "A6 (Mithul): No. Our TTS engine is built with @mhpdev/react-native-speech on React Native's New Architecture (TurboModules) and links directly to the Android OS native Google Speech Engine, meaning it runs completely offline.")
    ]
    
    for q, a in qa_list:
        p_q = doc.add_paragraph()
        p_q.paragraph_format.space_before = Pt(8)
        p_q.paragraph_format.space_after = Pt(2)
        rq = p_q.add_run(q)
        rq.bold = True
        rq.font.size = Pt(10.5)
        rq.font.color.rgb = RGBColor(15, 23, 42)
        
        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_after = Pt(6)
        ra = p_a.add_run(a)
        ra.font.size = Pt(10)
        ra.font.color.rgb = RGBColor(71, 85, 105)
        
    doc.save(output_path)
    print(f"Successfully generated Word document at: {output_path}")

if __name__ == '__main__':
    target = r"d:\MCA\Sem 3\Capstone Project\FOODLENS_CAPSTONE_REVIEW_MODULE_GUIDE_UPDATED.docx"
    build_document(target)
