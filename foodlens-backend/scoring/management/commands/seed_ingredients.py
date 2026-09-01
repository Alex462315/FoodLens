"""
Management command: seed_ingredients

Populates the Ingredient, IngredientAlias, and ConditionMultiplier tables
with ~30 starter ingredients, aliases, and condition-specific multiplier rules.

Usage:
    python manage.py seed_ingredients           # Only insert new, skip existing
    python manage.py seed_ingredients --reset   # Wipe and re-seed all three tables

Risk score buckets (documented for transparency):
    0–2  : Natural / generally safe
    3–5  : Caution — moderate concern in excess
    6–8  : Regular-excess harm — well-documented health impacts
    9–10 : Strong consensus of harm
"""
from django.core.management.base import BaseCommand
from scoring.models import Ingredient, IngredientAlias, ConditionMultiplier


# ---------------------------------------------------------------------------
# Seed data — ~30 ingredients across categories
# ---------------------------------------------------------------------------
INGREDIENTS = [
    # ── Sweeteners ──
    {
        'name': 'Sugar',
        'category': 'sweetener',
        'base_risk_score': 6.0,
        'allergen_flag': False,
        'source_reference': 'WHO guideline: Sugars intake for adults and children (2015). '
                            'Excess free-sugar intake linked to obesity, type-2 diabetes, dental caries.',
        'aliases': ['Sucrose', 'Cane Sugar', 'Table Sugar', 'Sucre'],
    },
    {
        'name': 'High Fructose Corn Syrup',
        'category': 'sweetener',
        'base_risk_score': 7.5,
        'allergen_flag': False,
        'source_reference': 'Stanhope et al. (2009), J Clin Invest. HFCS linked to increased '
                            'visceral adiposity, dyslipidemia, insulin resistance vs sucrose.',
        'aliases': ['HFCS', 'Corn Syrup', 'Glucose-Fructose Syrup', 'Isoglucose'],
    },
    {
        'name': 'Aspartame',
        'category': 'sweetener',
        'base_risk_score': 4.0,
        'allergen_flag': False,
        'source_reference': 'IARC (2023): classified as "possibly carcinogenic" (Group 2B). '
                            'FDA maintains GRAS status at approved levels.',
        'aliases': ['E951', 'NutraSweet', 'Equal'],
    },
    {
        'name': 'Stevia',
        'category': 'sweetener',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'EFSA (2010): steviol glycosides ADI 4 mg/kg. '
                            'No genotoxic or carcinogenic effects at approved levels.',
        'aliases': ['Steviol Glycosides', 'E960', 'Rebaudioside A'],
    },
    {
        'name': 'Jaggery',
        'category': 'sweetener',
        'base_risk_score': 4.5,
        'allergen_flag': False,
        'source_reference': 'Retains some minerals vs refined sugar, but still high glycemic. '
                            'ICMR dietary guidelines recommend limiting all added sugars.',
        'aliases': ['Gur', 'Palm Jaggery'],
    },

    # ── Fats & Oils ──
    {
        'name': 'Palm Oil',
        'category': 'fat',
        'base_risk_score': 5.5,
        'allergen_flag': False,
        'source_reference': 'WHO/FAO (2003): High in saturated palmitic acid (44%). '
                            'Associated with increased LDL cholesterol when consumed in excess.',
        'aliases': ['Palmolein', 'Palm Olein', 'Vegetable Fat (Palm)', 'huile de palme'],
    },
    {
        'name': 'Partially Hydrogenated Oil',
        'category': 'fat',
        'base_risk_score': 9.5,
        'allergen_flag': False,
        'source_reference': 'WHO elimination target by 2023. FDA banned artificial trans fats '
                            '(2018). Strong evidence of CVD risk increase.',
        'aliases': ['Trans Fat', 'Hydrogenated Vegetable Oil', 'PHO', 'Partially Hydrogenated Soybean Oil'],
    },
    {
        'name': 'Coconut Oil',
        'category': 'fat',
        'base_risk_score': 3.5,
        'allergen_flag': False,
        'source_reference': 'AHA advisory (2017): High in saturated fat (82%) but medium-chain '
                            'triglycerides may have neutral metabolic effects. Moderate risk.',
        'aliases': ['Virgin Coconut Oil', 'Copra Oil'],
    },
    {
        'name': 'Olive Oil',
        'category': 'fat',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'PREDIMED trial (2013): Mediterranean diet with extra-virgin olive oil '
                            'reduces major cardiovascular events by ~30%.',
        'aliases': ['Extra Virgin Olive Oil', 'EVOO'],
    },
    {
        'name': 'Sunflower Oil',
        'category': 'fat',
        'base_risk_score': 2.5,
        'allergen_flag': False,
        'source_reference': 'High in linoleic acid (omega-6). Generally considered safe. '
                            'Concern only with excessive omega-6:omega-3 ratio in total diet.',
        'aliases': ['Sunflower Seed Oil', 'High Oleic Sunflower Oil'],
    },

    # ── Sodium-Containing ──
    {
        'name': 'Salt',
        'category': 'sodium_containing',
        'base_risk_score': 5.0,
        'allergen_flag': False,
        'source_reference': 'WHO recommends <5g/day. DASH study (1997): sodium reduction '
                            'significantly lowers blood pressure in hypertensive individuals.',
        'aliases': ['Sodium Chloride', 'NaCl', 'Table Salt', 'Sea Salt', 'Rock Salt', 'Sel'],
    },
    {
        'name': 'Sodium Nitrite',
        'category': 'sodium_containing',
        'base_risk_score': 6.5,
        'allergen_flag': False,
        'source_reference': 'IARC (2015): processed meats preserved with nitrites classified as '
                            'Group 1 carcinogen. Nitrites form nitrosamines under heat.',
        'aliases': ['E250', 'Curing Salt'],
    },

    # ── Preservatives ──
    {
        'name': 'Sodium Benzoate',
        'category': 'preservative',
        'base_risk_score': 5.0,
        'allergen_flag': False,
        'source_reference': 'Lau et al. (2006): In combination with ascorbic acid can form benzene. '
                            'EFSA re-evaluation (2016) maintained ADI at 5 mg/kg.',
        'aliases': ['E211', 'Benzoate of Soda'],
    },
    {
        'name': 'Potassium Sorbate',
        'category': 'preservative',
        'base_risk_score': 2.0,
        'allergen_flag': False,
        'source_reference': 'EFSA (2015): Safe at current use levels. ADI 25 mg/kg. '
                            'No genotoxic concern.',
        'aliases': ['E202', 'Sorbic Acid Potassium Salt'],
    },
    {
        'name': 'BHA',
        'category': 'preservative',
        'base_risk_score': 7.0,
        'allergen_flag': False,
        'source_reference': 'NTP (2021): "reasonably anticipated to be a human carcinogen." '
                            'IARC Group 2B. Restricted in EU baby foods.',
        'aliases': ['Butylated Hydroxyanisole', 'E320'],
    },
    {
        'name': 'TBHQ',
        'category': 'preservative',
        'base_risk_score': 6.0,
        'allergen_flag': False,
        'source_reference': 'EFSA (2016): ADI lowered to 0.7 mg/kg from previous 1.0. '
                            'Some immunotoxicity concerns at high doses in animal studies.',
        'aliases': ['Tertiary Butylhydroquinone', 'E319'],
    },

    # ── Flavor Enhancers ──
    {
        'name': 'Monosodium Glutamate',
        'category': 'flavor_enhancer',
        'base_risk_score': 3.0,
        'allergen_flag': False,
        'source_reference': 'FASEB (1995): FDA GRAS. "MSG symptom complex" not consistently '
                            'reproduced in double-blind trials. Generally safe.',
        'aliases': ['MSG', 'E621', 'Glutamic Acid', 'Ajinomoto'],
    },
    {
        'name': 'Disodium Inosinate',
        'category': 'flavor_enhancer',
        'base_risk_score': 2.5,
        'allergen_flag': False,
        'source_reference': 'EFSA (2016): No safety concerns at current use levels. '
                            'Often combined with MSG to enhance umami.',
        'aliases': ['E631', 'IMP'],
    },

    # ── Refined Carbohydrates ──
    {
        'name': 'Refined Wheat Flour',
        'category': 'refined_carb',
        'base_risk_score': 5.0,
        'allergen_flag': True,
        'source_reference': 'High glycemic index (~71). Stripped of fiber and micronutrients. '
                            'Contains gluten — allergen for celiac patients.',
        'aliases': ['Maida', 'White Flour', 'All-Purpose Flour', 'Wheat Flour', 'Farine de blé'],
    },
    {
        'name': 'Corn Starch',
        'category': 'refined_carb',
        'base_risk_score': 3.0,
        'allergen_flag': False,
        'source_reference': 'High glycemic index (~85). Low nutrient density. '
                            'Generally safe but contributes to blood sugar spikes.',
        'aliases': ['Cornflour', 'Corn Flour', 'Maize Starch'],
    },

    # ── Natural / Low-Risk ──
    {
        'name': 'Turmeric',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Hewlings & Kalman (2017): Curcumin has anti-inflammatory and '
                            'antioxidant properties. GRAS status. Traditional use worldwide.',
        'aliases': ['Curcumin', 'Haldi', 'E100'],
    },
    {
        'name': 'Black Pepper',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Piperine enhances bioavailability of curcumin. '
                            'No documented risks at culinary levels.',
        'aliases': ['Piperine', 'Kali Mirch'],
    },
    {
        'name': 'Citric Acid',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'EFSA (2016): No safety concern. Naturally present in citrus fruits. '
                            'Manufactured citric acid is generally identical.',
        'aliases': ['E330', 'Vitamin C Acid'],
    },
    {
        'name': 'Ascorbic Acid',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Vitamin C. Essential nutrient. GRAS. '
                            'No risk at food-additive levels.',
        'aliases': ['Vitamin C', 'E300'],
    },
    {
        'name': 'Pectin',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Soluble dietary fiber from fruit. GRAS. '
                            'May help lower cholesterol (FDA qualified health claim).',
        'aliases': ['E440', 'Fruit Pectin'],
    },

    # ── Allergen-Flagged Ingredients ──
    {
        'name': 'Peanuts',
        'category': 'natural',
        'base_risk_score': 1.5,
        'allergen_flag': True,
        'source_reference': 'FARE: Peanut allergy affects ~2% of US children. '
                            'Can cause anaphylaxis. Nutritionally beneficial otherwise.',
        'aliases': ['Groundnuts', 'Arachis Hypogaea', 'Peanut Butter'],
    },
    {
        'name': 'Milk',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': True,
        'source_reference': 'Common allergen (casein, whey). Lactose intolerance prevalent '
                            'in South/East Asian populations (~65–90%).',
        'aliases': ['Whole Milk', 'Skim Milk', 'Milk Solids', 'Casein', 'Whey', 'Lactose', 'lait', 'lait écrémé en poudre', 'Poudre de lait'],
    },
    {
        'name': 'Gluten',
        'category': 'natural',
        'base_risk_score': 1.5,
        'allergen_flag': True,
        'source_reference': 'Celiac Disease Foundation: Affects ~1% of population. '
                            'Must be avoided entirely by celiac patients.',
        'aliases': ['Wheat Gluten', 'Vital Wheat Gluten', 'Seitan'],
    },
    {
        'name': 'Soy',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': True,
        'source_reference': 'FDA: Major allergen. One of the "Big 9" allergens. '
                            'Nutritionally beneficial but allergenic for ~0.4% of children.',
        'aliases': ['Soybean', 'Soy Lecithin', 'Soya', 'Soy Protein'],
    },
    {
        'name': 'Tree Nuts',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': True,
        'source_reference': 'FDA: Major allergen. Includes almonds, cashews, walnuts, etc. '
                            'Can cause severe anaphylaxis.',
        'aliases': ['Almonds', 'Cashews', 'Walnuts', 'Pistachios', 'Hazelnuts', 'Noisettes'],
    },

    # ── Emulsifiers ──
    {
        'name': 'Soy Lecithin',
        'category': 'emulsifier',
        'base_risk_score': 1.5,
        'allergen_flag': True,
        'source_reference': 'Generally low allergenicity (most soy protein removed). '
                            'FDA GRAS. Included as allergen per labeling requirements.',
        'aliases': ['E322', 'Lecithin (Soy)', 'lecithines (SOJA)', 'SOJA', 'Soja'],
    },
    {
        'name': 'Carrageenan',
        'category': 'emulsifier',
        'base_risk_score': 4.0,
        'allergen_flag': False,
        'source_reference': 'Tobacman (2001): Degraded carrageenan linked to GI inflammation '
                            'in animal studies. EFSA (2018) re-evaluation ongoing.',
        'aliases': ['E407', 'Irish Moss Extract'],
    },

    # ── Colorants ──
    {
        'name': 'Tartrazine',
        'category': 'colorant',
        'base_risk_score': 5.0,
        'allergen_flag': False,
        'source_reference': 'McCann et al. (2007), Lancet: Southampton study linked artificial '
                            'colors including tartrazine to hyperactivity in children.',
        'aliases': ['E102', 'Yellow 5', 'FD&C Yellow No. 5'],
    },

    # ── Vegetables & Starches ──
    {
        'name': 'Potato',
        'category': 'natural',
        'base_risk_score': 1.5,
        'allergen_flag': False,
        'source_reference': 'Whole potato is nutritious. High GI when processed into chips/powder.',
        'aliases': ['Potatoes', 'Potato Powder', 'Potato Starch', 'Potato Flakes', 'Dehydrated Potato', 'Pommes de terre'],
    },
    {
        'name': 'Modified Starch',
        'category': 'refined_carb',
        'base_risk_score': 3.5,
        'allergen_flag': False,
        'source_reference': 'Generally recognized as safe by FDA/EFSA. High glycemic, low nutrition.',
        'aliases': ['Modified Food Starch', 'Modified Corn Starch', 'Modified Tapioca Starch',
                    'Modified Potato Starch', 'E1400', 'E1401', 'E1404', 'E1410', 'E1412',
                    'E1413', 'E1414', 'E1420', 'E1422', 'E1440', 'E1442', 'E1450',
                    'Starch (Modified)', 'Amidon modifié'],
    },
    {
        'name': 'Tapioca Starch',
        'category': 'refined_carb',
        'base_risk_score': 3.0,
        'allergen_flag': False,
        'source_reference': 'Naturally gluten-free. High GI (~85). Used as thickener.',
        'aliases': ['Tapioca', 'Cassava Starch', 'Tapioca Flour', 'Sabudana'],
    },
    {
        'name': 'Rice',
        'category': 'refined_carb',
        'base_risk_score': 2.5,
        'allergen_flag': False,
        'source_reference': 'Staple grain. White rice has high GI (~70). Brown rice is lower risk.',
        'aliases': ['Rice Flour', 'Rice Starch', 'White Rice', 'Brown Rice', 'Rice Powder',
                    'Puffed Rice', 'Flattened Rice', 'Poha', 'Murmura', 'Farine de riz'],
    },
    {
        'name': 'Wheat',
        'category': 'refined_carb',
        'base_risk_score': 4.0,
        'allergen_flag': True,
        'source_reference': 'Contains gluten. Whole wheat is nutritious; refined is high GI.',
        'aliases': ['Whole Wheat', 'Whole Wheat Flour', 'Wheat Bran', 'Wheat Germ',
                    'Atta', 'Durum Wheat', 'Semolina', 'Rava', 'Sooji', 'Suji',
                    'Broken Wheat', 'Daliya', 'farine de blé complet', 'Blé'],
    },
    {
        'name': 'Oats',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'High in beta-glucan fiber. FDA health claim for cholesterol reduction. Low GI.',
        'aliases': ['Rolled Oats', 'Oat Flour', 'Oat Bran', 'Instant Oats', 'Steel Cut Oats', 'Avoine'],
    },
    {
        'name': 'Chickpea Flour',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'High protein, high fiber, low GI. Good nutritional profile.',
        'aliases': ['Besan', 'Gram Flour', 'Bengal Gram Flour', 'Chana Dal Flour'],
    },

    # ── Dairy & Dairy Derivatives ──
    {
        'name': 'Skimmed Milk Powder',
        'category': 'natural',
        'base_risk_score': 1.5,
        'allergen_flag': True,
        'source_reference': 'Contains milk proteins (allergen). Nutritionally dense. Low fat.',
        'aliases': ['Skim Milk Powder', 'Non-Fat Dry Milk', 'Dried Skim Milk', 'Milk Powder',
                    'Dry Whole Milk', 'Full Cream Milk Powder', 'SMP',
                    'lait écrémé en poudre', 'poudre de lait entier', 'Lait en poudre'],
    },
    {
        'name': 'Butter',
        'category': 'fat',
        'base_risk_score': 4.0,
        'allergen_flag': True,
        'source_reference': 'High in saturated fat. Contains milk allergens. Natural but calorie-dense.',
        'aliases': ['Butter Oil', 'Clarified Butter', 'Ghee', 'Desi Ghee', 'Beurre'],
    },
    {
        'name': 'Cream',
        'category': 'fat',
        'base_risk_score': 3.0,
        'allergen_flag': True,
        'source_reference': 'High fat dairy product. Contains milk allergens.',
        'aliases': ['Heavy Cream', 'Whipping Cream', 'Double Cream', 'Crème', 'Cream Powder'],
    },
    {
        'name': 'Whey Protein',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': True,
        'source_reference': 'High quality protein supplement. Derived from milk — allergen.',
        'aliases': ['Whey', 'Whey Powder', 'Whey Solids', 'Whey Protein Concentrate',
                    'Whey Protein Isolate', 'Lactosérum', 'Perméat de lactosérum'],
    },

    # ── Cocoa & Chocolate ──
    {
        'name': 'Cocoa',
        'category': 'natural',
        'base_risk_score': 1.5,
        'allergen_flag': False,
        'source_reference': 'Rich in flavonoids. Health benefits at moderate consumption. '
                            'High in calories when combined with sugar.',
        'aliases': ['Cocoa Powder', 'Cocoa Mass', 'Cocoa Butter', 'Cacao', 'Cacao Powder',
                    'Dark Chocolate', 'Chocolate', 'Cocoa Solids', 'Beurre de cacao',
                    'Poudre de cacao', 'Masse de cacao'],
    },
    {
        'name': 'Hazelnut',
        'category': 'natural',
        'base_risk_score': 1.5,
        'allergen_flag': True,
        'source_reference': 'Tree nut allergen. Nutritionally rich in healthy fats and vitamin E.',
        'aliases': ['Hazelnut Paste', 'Hazelnut Oil', 'Noisettes', 'Noisette'],
    },

    # ── Sweeteners (additional) ──
    {
        'name': 'Glucose Syrup',
        'category': 'sweetener',
        'base_risk_score': 6.5,
        'allergen_flag': False,
        'source_reference': 'Pure glucose — very high GI (~100). Rapidly raises blood sugar. '
                            'Linked to insulin resistance with excessive use.',
        'aliases': ['Glucose', 'Dextrose', 'Liquid Glucose', 'Corn Syrup Solids',
                    'Sirop de glucose', 'Glucose-Fructose'],
    },
    {
        'name': 'Maltose',
        'category': 'sweetener',
        'base_risk_score': 5.5,
        'allergen_flag': False,
        'source_reference': 'Disaccharide with high GI (~105). Used in baking and confectionery.',
        'aliases': ['Malt Syrup', 'Malted Barley', 'Malt Extract', 'Barley Malt'],
    },
    {
        'name': 'Honey',
        'category': 'sweetener',
        'base_risk_score': 4.0,
        'allergen_flag': False,
        'source_reference': 'Natural sweetener with antimicrobial properties but high in fructose. '
                            'Not suitable for infants under 1 year.',
        'aliases': ['Natural Honey', 'Raw Honey', 'Miel'],
    },
    {
        'name': 'Sucralose',
        'category': 'sweetener',
        'base_risk_score': 3.0,
        'allergen_flag': False,
        'source_reference': 'FDA GRAS. ~600x sweeter than sugar. Recent studies suggest possible '
                            'gut microbiome impact at high doses.',
        'aliases': ['E955', 'Splenda'],
    },
    {
        'name': 'Acesulfame Potassium',
        'category': 'sweetener',
        'base_risk_score': 3.5,
        'allergen_flag': False,
        'source_reference': 'FDA approved. 200x sweeter than sugar. Often used with sucralose. '
                            'Some animal studies raise concern at very high doses.',
        'aliases': ['Acesulfame-K', 'Ace-K', 'E950'],
    },

    # ── Vegetable Oils (additional) ──
    {
        'name': 'Canola Oil',
        'category': 'fat',
        'base_risk_score': 2.0,
        'allergen_flag': False,
        'source_reference': 'Low in saturated fat. Good omega-3 to omega-6 ratio. '
                            'Widely accepted as heart-healthy oil.',
        'aliases': ['Rapeseed Oil', 'Canola', 'Colza', 'huile de colza', 'Vegetable Oil (Rapeseed)'],
    },
    {
        'name': 'Soybean Oil',
        'category': 'fat',
        'base_risk_score': 3.0,
        'allergen_flag': True,
        'source_reference': 'High in omega-6. May contribute to inflammation when overconsumed. '
                            'Derived from soy — potential allergen.',
        'aliases': ['Soy Oil', 'Soya Oil', 'Vegetable Oil (Soy)', 'huile de soja'],
    },
    {
        'name': 'Rice Bran Oil',
        'category': 'fat',
        'base_risk_score': 2.0,
        'allergen_flag': False,
        'source_reference': 'Good balance of saturated/unsaturated fats. Contains oryzanol '
                            'which may lower cholesterol. Popular in Indian cooking.',
        'aliases': ['Rice Oil', 'Rice Bran'],
    },

    # ── Spices & Natural Flavors ──
    {
        'name': 'Cinnamon',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Anti-inflammatory and antioxidant properties. '
                            'May help regulate blood sugar in T2D patients.',
        'aliases': ['Dalchini', 'Cassia', 'Ceylon Cinnamon', 'Cannelle'],
    },
    {
        'name': 'Cardamom',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Traditional Ayurvedic spice. Digestive aid. No known adverse effects.',
        'aliases': ['Elaichi', 'Green Cardamom', 'Cardamome'],
    },
    {
        'name': 'Cumin',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Traditional spice. Rich in iron. No known adverse effects at culinary doses.',
        'aliases': ['Jeera', 'Cumin Seeds', 'Cumin Powder', 'Cumins'],
    },
    {
        'name': 'Coriander',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Traditional spice/herb. Rich in antioxidants. No known adverse effects.',
        'aliases': ['Dhania', 'Coriander Seeds', 'Coriander Powder', 'Cilantro', 'Coriandre'],
    },
    {
        'name': 'Chilli',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Capsaicin has anti-inflammatory properties. '
                            'No adverse effects at culinary levels.',
        'aliases': ['Chili', 'Red Chilli', 'Chilli Powder', 'Red Chili Pepper',
                    'Paprika', 'Cayenne', 'Mirchi', 'Lal Mirch', 'Piment'],
    },
    {
        'name': 'Ginger',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Anti-inflammatory properties from gingerols. GRAS. Digestive aid.',
        'aliases': ['Adrak', 'Dry Ginger', 'Ginger Powder', 'Gingembre'],
    },
    {
        'name': 'Garlic',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Allicin has antimicrobial and cardioprotective properties. GRAS.',
        'aliases': ['Garlic Powder', 'Garlic Extract', 'Lehsun', 'Ail'],
    },
    {
        'name': 'Onion',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Rich in quercetin and fiber. No adverse effects at culinary levels.',
        'aliases': ['Onion Powder', 'Dehydrated Onion', 'Onion Flakes', 'Pyaaz', 'Oignon'],
    },

    # ── Preservatives & Acids (additional) ──
    {
        'name': 'Acetic Acid',
        'category': 'preservative',
        'base_risk_score': 1.5,
        'allergen_flag': False,
        'source_reference': 'Naturally present in vinegar. GRAS. Safe antimicrobial preservative.',
        'aliases': ['Vinegar', 'E260', 'White Vinegar', 'Spirit Vinegar', 'Malt Vinegar', 'Vinaigre'],
    },
    {
        'name': 'Sorbic Acid',
        'category': 'preservative',
        'base_risk_score': 2.0,
        'allergen_flag': False,
        'source_reference': 'EFSA: Safe at ADI 25 mg/kg. Natural preservative found in rowan berries.',
        'aliases': ['E200', 'Calcium Sorbate'],
    },
    {
        'name': 'Sodium Metabisulphite',
        'category': 'preservative',
        'base_risk_score': 4.0,
        'allergen_flag': False,
        'source_reference': 'E223: Can cause sulphite sensitivity reactions in some individuals, '
                            'especially asthmatics. Must be declared above 10 ppm.',
        'aliases': ['E223', 'Sodium Metabisulfite', 'Sulphur Dioxide', 'Sulfites', 'E220', 'E221', 'E222'],
    },
    {
        'name': 'Calcium Carbonate',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'GRAS. Used as acidity regulator and calcium supplement. Safe.',
        'aliases': ['E170', 'Chalk', 'Carbonate de calcium'],
    },
    {
        'name': 'Sodium Bicarbonate',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'Leavening agent. GRAS. Adds sodium to diet but very small amounts used.',
        'aliases': ['E500', 'Baking Soda', 'Bicarbonate of Soda', 'Soda Bicarbonate',
                    'Baking Powder', 'Bicarbonate de soude'],
    },
    {
        'name': 'Lactic Acid',
        'category': 'natural',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'EFSA/FDA GRAS. Naturally produced in fermentation. Safe acidity regulator.',
        'aliases': ['E270', 'Lactate', 'Acide lactique'],
    },
    {
        'name': 'Phosphoric Acid',
        'category': 'preservative',
        'base_risk_score': 4.5,
        'allergen_flag': False,
        'source_reference': 'Linked to lower bone density (Tucker et al. 2006) in cola drinks. '
                            'Also associated with dental erosion.',
        'aliases': ['E338', 'Orthophosphoric Acid', 'Acide phosphorique'],
    },

    # ── Emulsifiers & Stabilizers (additional) ──
    {
        'name': 'Mono and Diglycerides',
        'category': 'emulsifier',
        'base_risk_score': 2.5,
        'allergen_flag': False,
        'source_reference': 'FDA GRAS. May contain trace trans fats. Generally considered safe.',
        'aliases': ['E471', 'Mono- and Diglycerides of Fatty Acids', 'Glyceryl Monostearate',
                    'Monoglycérides', 'Diglycérides', 'Mono et diglycérides'],
    },
    {
        'name': 'DATEM',
        'category': 'emulsifier',
        'base_risk_score': 3.0,
        'allergen_flag': False,
        'source_reference': 'FDA GRAS. Used in bread and baked goods as dough conditioner. '
                            'Some concern at very high doses in animal studies.',
        'aliases': ['E472e', 'Diacetyl Tartaric Acid Esters of Mono and Diglycerides'],
    },
    {
        'name': 'Xanthan Gum',
        'category': 'emulsifier',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'FDA GRAS. Fermentation-derived polysaccharide. '
                            'Acts as dietary fiber. No known adverse effects.',
        'aliases': ['E415', 'Xanthan'],
    },
    {
        'name': 'Guar Gum',
        'category': 'emulsifier',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'FDA GRAS. Natural fiber from guar beans. '
                            'May help lower cholesterol and blood sugar.',
        'aliases': ['E412', 'Guar', 'Guar Flour'],
    },
    {
        'name': 'Locust Bean Gum',
        'category': 'emulsifier',
        'base_risk_score': 1.0,
        'allergen_flag': False,
        'source_reference': 'EFSA: Safe. Natural thickener from carob seeds. Used in dairy products.',
        'aliases': ['E410', 'Carob Bean Gum', 'Carouba'],
    },

    # ── Colorants (additional) ──
    {
        'name': 'Annatto',
        'category': 'colorant',
        'base_risk_score': 3.0,
        'allergen_flag': False,
        'source_reference': 'Natural color from achiote seeds. EFSA (2012): ADI 0.065 mg/kg. '
                            'Some rare allergic reactions reported.',
        'aliases': ['E160b', 'Bixin', 'Norbixin', 'Annatto Extract'],
    },
    {
        'name': 'Caramel Color',
        'category': 'colorant',
        'base_risk_score': 4.0,
        'allergen_flag': False,
        'source_reference': 'Class IV caramel (E150d) contains 4-MEI — potential carcinogen '
                            'at high doses (IARC Group 2B). Used in colas and dark sauces.',
        'aliases': ['E150', 'E150a', 'E150b', 'E150c', 'E150d', 'Caramel Colouring',
                    'Caramel Coloring', 'Colour (Caramel)', 'Colorant (Caramel)'],
    },
    {
        'name': 'Sunset Yellow',
        'category': 'colorant',
        'base_risk_score': 5.0,
        'allergen_flag': False,
        'source_reference': 'Part of the "Southampton Six" artificial colors linked to '
                            'hyperactivity in children (McCann et al. 2007).',
        'aliases': ['E110', 'Yellow 6', 'FD&C Yellow No. 6', 'Orange Yellow S'],
    },
    {
        'name': 'Allura Red',
        'category': 'colorant',
        'base_risk_score': 5.0,
        'allergen_flag': False,
        'source_reference': 'Part of the "Southampton Six". Linked to hyperactivity in children. '
                            'Banned in several European countries.',
        'aliases': ['E129', 'Red 40', 'FD&C Red No. 40'],
    },
    {
        'name': 'Brilliant Blue',
        'category': 'colorant',
        'base_risk_score': 4.0,
        'allergen_flag': False,
        'source_reference': 'FDA approved. Some animal studies suggest mild genotoxicity. '
                            'No confirmed human adverse effects at typical doses.',
        'aliases': ['E133', 'Blue 1', 'FD&C Blue No. 1'],
    },

    # ── Vitamins & Minerals (fortification) ──
    {
        'name': 'Iron',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Essential mineral. Fortification is beneficial. Safe at food use levels.',
        'aliases': ['Ferrous Sulphate', 'Ferrous Sulfate', 'Reduced Iron', 'Iron (as Ferrous Fumarate)',
                    'Fer'],
    },
    {
        'name': 'Vitamin D',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'Essential vitamin. Deficiency widespread in India. Fortification beneficial.',
        'aliases': ['Vitamin D3', 'Cholecalciferol', 'Vitamin D2', 'Ergocalciferol', 'Vitamine D'],
    },
    {
        'name': 'Niacin',
        'category': 'natural',
        'base_risk_score': 0.5,
        'allergen_flag': False,
        'source_reference': 'B-vitamin. Essential nutrient. Safe at food fortification levels.',
        'aliases': ['Vitamin B3', 'Nicotinamide', 'Nicotinic Acid', 'Niacinamide'],
    },
]


# ---------------------------------------------------------------------------
# Condition multiplier rules (severity weighting applied at runtime)
# ---------------------------------------------------------------------------
CONDITION_MULTIPLIERS = [
    # Diabetes — extra risk from sweeteners and refined carbs
    {'condition_name': 'Diabetes', 'ingredient_category': 'sweetener', 'multiplier_value': 1.50},
    {'condition_name': 'Diabetes', 'ingredient_category': 'refined_carb', 'multiplier_value': 1.30},

    # Hypertension — extra risk from sodium
    {'condition_name': 'Hypertension', 'ingredient_category': 'sodium_containing', 'multiplier_value': 1.40},

    # Obesity — extra risk from fats and sweeteners
    {'condition_name': 'Obesity', 'ingredient_category': 'fat', 'multiplier_value': 1.30},
    {'condition_name': 'Obesity', 'ingredient_category': 'sweetener', 'multiplier_value': 1.20},

    # Heart Disease — extra risk from fats and sodium
    {'condition_name': 'Heart Disease', 'ingredient_category': 'fat', 'multiplier_value': 1.50},
    {'condition_name': 'Heart Disease', 'ingredient_category': 'sodium_containing', 'multiplier_value': 1.30},

    # Celiac Disease — extra risk from refined carbs (gluten-containing)
    {'condition_name': 'Celiac Disease', 'ingredient_category': 'refined_carb', 'multiplier_value': 1.50},

    # Kidney Disease — extra risk from sodium and preservatives
    {'condition_name': 'Kidney Disease', 'ingredient_category': 'sodium_containing', 'multiplier_value': 1.50},
    {'condition_name': 'Kidney Disease', 'ingredient_category': 'preservative', 'multiplier_value': 1.20},

    # ADHD — extra risk from colorants and preservatives
    {'condition_name': 'ADHD', 'ingredient_category': 'colorant', 'multiplier_value': 1.40},
    {'condition_name': 'ADHD', 'ingredient_category': 'preservative', 'multiplier_value': 1.20},
]


class Command(BaseCommand):
    help = 'Seed the ingredient risk database with ~30 ingredients, aliases, and condition multiplier rules.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Wipe all existing ingredient/alias/multiplier data before seeding.',
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING('Wiping existing scoring data...'))
            ConditionMultiplier.objects.all().delete()
            IngredientAlias.objects.all().delete()
            Ingredient.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('All scoring data deleted.'))

        # -- Seed Ingredients + Aliases --
        created_count = 0
        skipped_count = 0
        alias_count = 0

        for item in INGREDIENTS:
            aliases = item.pop('aliases', [])
            ingredient, created = Ingredient.objects.get_or_create(
                name=item['name'],
                defaults=item,
            )

            if created:
                created_count += 1
                self.stdout.write(f"  [+] Created: {ingredient.name} ({ingredient.category}, "
                                  f"risk={ingredient.base_risk_score})")
            else:
                skipped_count += 1
                self.stdout.write(f"  [-] Skipped (exists): {ingredient.name}")

            # Seed aliases for this ingredient
            for alias in aliases:
                _, alias_created = IngredientAlias.objects.get_or_create(
                    alias_name=alias,
                    defaults={'ingredient': ingredient},
                )
                if alias_created:
                    alias_count += 1

            # Restore aliases key for potential re-run
            item['aliases'] = aliases

        self.stdout.write(self.style.SUCCESS(
            f"\nIngredients: {created_count} created, {skipped_count} skipped"
        ))
        self.stdout.write(self.style.SUCCESS(f"Aliases: {alias_count} created"))

        # -- Seed Condition Multipliers --
        mult_created = 0
        mult_skipped = 0

        for rule in CONDITION_MULTIPLIERS:
            _, created = ConditionMultiplier.objects.get_or_create(
                condition_name=rule['condition_name'],
                ingredient_category=rule['ingredient_category'],
                defaults={'multiplier_value': rule['multiplier_value']},
            )
            if created:
                mult_created += 1
                self.stdout.write(f"  [+] Rule: {rule['condition_name']} + "
                                  f"{rule['ingredient_category']} -> x{rule['multiplier_value']}")
            else:
                mult_skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nMultiplier rules: {mult_created} created, {mult_skipped} skipped"
        ))

        self.stdout.write(self.style.SUCCESS('\nSeed complete!'))
