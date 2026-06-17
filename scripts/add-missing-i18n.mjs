/**
 * add-missing-i18n.mjs
 *
 * Reads scripts/missing-i18n-keys.json (produced by detect-missing-i18n.mjs),
 * merges the new keys (with Arabic translations) into src/i18n.ts automatically.
 *
 * Run: node scripts/add-missing-i18n.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const I18N_PATH = path.resolve(__dirname, "../src/i18n.ts");
const REPORT_PATH = path.resolve(__dirname, "missing-i18n-keys.json");

// ─── Arabic translations for all detected strings ─────────────────────────────
// Manually curated so the Arabic is accurate, not machine-guessed.
const AR_TRANSLATIONS = {
  admin: "الإدارة",
  notifications: "الإشعارات",
  loading_notifications: "جارٍ تحميل الإشعارات...",
  all_caught_up: "لا توجد إشعارات جديدة!",
  no_new_notifications: "لا توجد إشعارات جديدة",
  all_categories_2: "كل الأقسام",
  all_products: "كل المنتجات",
  past_week: "الأسبوع الماضي",
  past_month: "الشهر الماضي",
  past_year: "السنة الماضية",
  all_time: "كل الوقت",
  no_category_sales_data: "لا توجد بيانات مبيعات للأقسام",
  no_products_sold: "لم يتم بيع أي منتجات.",
  all_products_performing_well: "جميع المنتجات تؤدي بشكل جيد.",
  no_inventory_data: "لا توجد بيانات مخزون",
  no_categories_found: "لا توجد أقسام.",
  loading_customers: "جارٍ تحميل العملاء...",
  all_statuses: "كل الحالات",
  has_pending: "لديه طلبات معلقة",
  has_shipped: "لديه طلبات مشحونة",
  total_orders: "إجمالي الطلبات",
  total_spent: "إجمالي الإنفاق",
  last_order: "آخر طلب",
  today: "اليوم",
  this_week: "هذا الأسبوع",
  this_month: "هذا الشهر",
  avg_order_value: "متوسط قيمة الطلب",
  customer: "العميل",
  date: "التاريخ",
  total_2: "الإجمالي",
  status_2: "الحالة",
  action: "الإجراء",
  loading_inventory: "جارٍ تحميل المخزون...",
  product: "المنتج",
  price_2: "السعر",
  stock_count: "عدد المخزون",
  email_2: "البريد الإلكتروني",
  password_2: "كلمة المرور",
  or_continue_with: "أو تابع باستخدام",
  loading: "جارٍ التحميل...",
  all_dates: "كل التواريخ",
  export_xls: "تصدير XLS",
  import_xls: "استيراد XLS",
  stock: "المخزون",
  no_data_found: "لا توجد بيانات.",
  simulate_data: "محاكاة البيانات",
  import_a_report_or_generate_random_data_: "استورد تقريراً أو أنشئ بيانات عشوائية لمعرفة كيف ستتغير التحليلات.",
  total_revenue: "إجمالي الإيرادات",
  avg_order_value_2: "متوسط قيمة الطلب",
  cart_abandonment: "التخلي عن السلة",
  average_order_value_aov_trend: "اتجاه متوسط قيمة الطلب (AOV)",
  reveals_pricing_effectiveness_and_upsell: "يكشف فعالية التسعير ونجاح البيع الإضافي",
  no_data_2: "لا توجد بيانات",
  revenue_by_channel: "الإيرادات حسب القناة",
  new_vs_returning_customers_revenue: "إيرادات العملاء الجدد مقابل العائدين",
  shows_whether_growth_is_from_acquisition: "يوضح ما إذا كان النمو من الاستحواذ أم الاحتفاظ",
  sales_over_time_2: "المبيعات بمرور الوقت",
  revenue_vs_orders_trend: "اتجاه الإيرادات مقابل الطلبات",
  conversion_funnel: "قمع التحويل",
  cart_abandonment_rate: "معدل التخلي عن السلة",
  one_of_the_biggest_hidden_revenue_leaks: "من أكبر تسربات الإيرادات الخفية",
  customer_behavior: "سلوك العملاء",
  customer_lifetime_value_clv_distribution: "توزيع القيمة الدائمة للعميل (CLV)",
  identifies_your_most_valuable_customer_s: "يحدد شرائح عملائك الأكثر قيمة",
  repeat_purchase_rate: "معدل الشراء المتكرر",
  core_signal_of_brand_loyalty: "مؤشر أساسي لولاء العلامة التجارية",
  cohort_retention_chart: "مخطط الاحتفاظ بالمجموعات",
  shows_how_long_customers_stick_around_si: "يوضح مدة بقاء العملاء (محاكاة)",
  product_performance_deep_dive: "تحليل أداء المنتج المعمق",
  product_conversion_rate: "معدل تحويل المنتج",
  inventory_turnover_rate: "معدل دوران المخزون",
  helps_avoid_overstocking_or_dead_invento: "يساعد على تجنب الإفراط في التخزين أو المخزون الراكد",
  profit_margin_by_product: "هامش الربح حسب المنتج",
  top_products_revenue: "أفضل المنتجات (الإيرادات)",
  no_products_sold_2: "لم يتم بيع أي منتجات",
  all_products_performing_well_2: "جميع المنتجات تؤدي بشكل جيد",
  order_fulfillment_time: "وقت تنفيذ الطلب",
  impacts_customer_satisfaction_directly_d: "يؤثر مباشرة على رضا العملاء (بالأيام)",
  return_rate_by_product: "معدل الإرجاع حسب المنتج",
  flags_quality_or_expectation_issues: "يشير إلى مشكلات الجودة أو التوقعات",
  geographic_insights: "رؤى جغرافية",
  sales_by_location: "المبيعات حسب الموقع",
  useful_for_targeting_ads_shipping_strate: "مفيد لاستهداف الإعلانات واستراتيجيات الشحن والتوسع",
  no_location_data: "لا توجد بيانات موقع",
  time_based_patterns: "الأنماط الزمنية",
  hourly_sales_heatmap: "خريطة حرارة المبيعات بالساعة",
  helps_optimize_ad_timing_and_promotions: "يساعد على تحسين توقيت الإعلانات والعروض",
  seasonality_trends: "اتجاهات الموسمية",
  critical_for_forecasting_and_inventory_p: "ضروري للتنبؤ وتخطيط المخزون",
  marketing_performance: "أداء التسويق",
  customer_acquisition_cost_cac: "تكلفة اكتساب العميل (CAC)",
  keeps_ad_spend_sustainable: "يحافظ على استدامة الإنفاق الإعلاني",
  roas_by_campaign: "العائد على الإنفاق الإعلاني حسب الحملة",
  tells_you_which_campaigns_are_actually_p: "يخبرك بالحملات المربحة فعلاً",
  low_stock_forecast: "توقعات المخزون المنخفض",
  prevents_stockouts_before_they_happen: "يمنع نفاد المخزون قبل حدوثه",
  no_products_with_low_stock: "لا توجد منتجات بمخزون منخفض",
  sales_forecast_vs_actual: "توقعات المبيعات مقابل الفعلي",
  helps_planning_and_goal_tracking: "يساعد في التخطيط وتتبع الأهداف",
  sales_by_day_of_week: "المبيعات حسب يوم الأسبوع",
  inventory_health: "صحة المخزون",
  sales_by_category: "المبيعات حسب القسم",
  no_category_data: "لا توجد بيانات أقسام",
  preparing_cinematic_experience: "جارٍ تجهيز التجربة السينمائية",
  dates: "تمر",
  sweet: "حلو",
  subtotal: "المجموع الفرعي:",
  total_due: "الإجمالي المستحق:",
  all_items: "كل المنتجات",
  in_stock_only: "المتاح فقط",
  default_sorting: "الترتيب الافتراضي",
  price_low_to_high: "السعر: من الأقل للأعلى",
  price_high_to_low: "السعر: من الأعلى للأقل",
  subtotal_2: "المجموع الفرعي",
  products_2: "المنتجات",
  select_weight: "اختر الوزن",
  share: "مشاركة",
  calories: "سعرات حرارية",
  carbs: "كربوهيدرات",
  fiber: "ألياف",
  potassium: "بوتاسيوم",
};

// ─── Load the report ──────────────────────────────────────────────────────────
if (!fs.existsSync(REPORT_PATH)) {
  console.error("❌  missing-i18n-keys.json not found. Run detect-missing-i18n.mjs first.");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
const newKeys = Object.entries(report.en); // [[key, enValue], ...]

if (newKeys.length === 0) {
  console.log("✅  Nothing to add.");
  process.exit(0);
}

// ─── Read i18n.ts ─────────────────────────────────────────────────────────────
let source = fs.readFileSync(I18N_PATH, "utf8");

// ─── Build injection strings ──────────────────────────────────────────────────
const enLines = newKeys
  .map(([key, val]) => `      ${key}: "${val.replace(/"/g, '\\"')}",`)
  .join("\n");

const arLines = newKeys
  .map(([key]) => {
    const arVal = AR_TRANSLATIONS[key] || report.en[key]; // fallback to EN if no AR provided
    return `      ${key}: "${arVal.replace(/"/g, '\\"')}",`;
  })
  .join("\n");

// ─── Inject into EN block ─────────────────────────────────────────────────────
// Find the closing of en.translation and insert before it
const enInsertMarker = /(\s+total_price:\s*"Total Price",?\s*\n)(\s*\},\s*\n\s*\},\s*\n\};)/;

if (!enInsertMarker.test(source)) {
  // Fallback: find last key in en block by looking for the last entry before closing braces
  // We'll inject before the last `},` that closes en.translation
  const enBlockEnd = source.lastIndexOf('      total_price: "Total Price"');
  if (enBlockEnd === -1) {
    console.error("❌  Could not locate insertion point in en translation block.");
    console.log("   Please manually add the keys from scripts/missing-i18n-keys.json");
    process.exit(1);
  }
}

// Strategy: find the en translation closing and ar translation closing
// and insert new keys before each closing brace

function insertBeforeLastKey(src, blockMarker, newLines) {
  // Find the block (ar or en) and insert newLines before its closing `},`
  const blockStart = src.indexOf(blockMarker);
  if (blockStart === -1) return null;

  // Find the closing `},` of the translation object after blockStart
  // We look for the pattern: last key entry followed by `\n    },\n  },`
  const afterBlock = src.slice(blockStart);
  // Match the last key-value pair line followed by closing braces
  const closingMatch = afterBlock.match(/(\n\s{6}\w[^:]+:[^,\n]+,?\n)(\s{4}\},\n\s{2}\},)/);
  if (!closingMatch) return null;

  const insertPos = blockStart + afterBlock.indexOf(closingMatch[0]) + closingMatch[1].length;
  return src.slice(0, insertPos) + newLines + "\n" + src.slice(insertPos);
}

// Insert into EN block
let updated = insertBeforeLastKey(source, '  en: {', enLines);
if (!updated) {
  console.error("❌  Could not find EN translation block closing. Aborting.");
  process.exit(1);
}

// Insert into AR block
updated = insertBeforeLastKey(updated, '  ar: {', arLines);
if (!updated) {
  console.error("❌  Could not find AR translation block closing. Aborting.");
  process.exit(1);
}

// ─── Write back ───────────────────────────────────────────────────────────────
// Backup first
fs.writeFileSync(I18N_PATH + ".bak", source);
fs.writeFileSync(I18N_PATH, updated);

console.log(`\n✅  Successfully added ${newKeys.length} keys to src/i18n.ts`);
console.log(`   Backup saved to src/i18n.ts.bak\n`);
console.log("Keys added:");
newKeys.forEach(([key, val]) => {
  const ar = AR_TRANSLATIONS[key] || "(same as EN)";
  console.log(`   ${key.padEnd(45)} EN: "${val}" | AR: "${ar}"`);
});
console.log();
