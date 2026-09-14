import type { CalendarEntry } from "@/lib/schema";

/**
 * Date-sensitivity calendar: memorial, contested, celebratory and religious
 * dates per supported market, checked against a campaign's launch date.
 *
 * Variable-date windows are planning estimates, never exact dates. How they
 * were derived:
 * - Islamic dates: Umm al-Qura calendar (via ICU `islamic-umalqura`), checked
 *   against the tabular civil calendar and against the official 2025/2026
 *   announcements (Saudi Supreme Court, Indonesia's sidang isbat, Egypt's Dar
 *   al-Ifta). Windows are padded to cover the usual one-day spread between
 *   countries that follow Saudi Arabia and those that sight the moon locally.
 * - Chinese/Korean lunisolar dates: Wikipedia's Chinese New Year table, the
 *   PRC State Council holiday notices (2025, 2026) and Korean public-holiday
 *   calendars (substitute holidays included).
 * - Hindu festivals: Drik Panchang (New Delhi) and cross-checked calendars.
 * - Easter-derived and weekday-rule dates: computed (Gregorian/Julian computus,
 *   "Sunday on or after", "nth weekday of month").
 */

type Window = { start: string; end: string };
const w = (...pairs: [string, string][]): Window[] => pairs.map(([start, end]) => ({ start, end }));

/* ------------------------------------------------------------------ */
/* Shared Islamic-calendar windows                                     */
/* ------------------------------------------------------------------ */

/** First likely fast → last likely fast. 1452 AH starts in late December 2030, so 2030 has two windows. */
const RAMADAN: [string, string][] = [
  ["2025-03-01", "2025-03-30"],
  ["2026-02-18", "2026-03-20"],
  ["2027-02-08", "2027-03-09"],
  ["2028-01-28", "2028-02-26"],
  ["2029-01-16", "2029-02-14"],
  ["2030-01-05", "2030-02-04"],
  ["2030-12-26", "2031-01-24"],
];

/** Earliest likely 1 Shawwal → latest likely third day of Eid. */
const EID_AL_FITR: [string, string][] = [
  ["2025-03-30", "2025-04-02"],
  ["2026-03-20", "2026-03-23"],
  ["2027-03-09", "2027-03-12"],
  ["2028-02-26", "2028-02-29"],
  ["2029-02-14", "2029-02-17"],
  ["2030-02-04", "2030-02-07"],
];

/** Day of Arafah (9 Dhu al-Hijjah) → latest likely final day of Eid (13 Dhu al-Hijjah + 1). */
const EID_AL_ADHA: [string, string][] = [
  ["2025-06-05", "2025-06-10"],
  ["2026-05-26", "2026-05-31"],
  ["2027-05-15", "2027-05-20"],
  ["2028-05-04", "2028-05-09"],
  ["2029-04-23", "2029-04-28"],
  ["2030-04-12", "2030-04-17"],
];

const ISLAMIC_NOTE =
  "Islamic (lunar Hijri) calendar: each month begins with the sighting of the crescent moon, so dates shift about 11 days earlier each year and can differ by a day or two between countries. Windows are estimates from the Umm al-Qura calendar padded for that spread; confirm with the national religious authority's announcement.";

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

export const CALENDAR: CalendarEntry[] = [
  /* ============================== KR ============================== */
  {
    id: "kr-park-jong-chul-jan-14",
    market: "KR",
    label: "Death of Park Jong-chul under police torture (1987)",
    dateRule: { type: "fixed", date: "01-14" },
    gravity: "solemn",
    guidance:
      "The police cover-up line \"탁 치니 억 하고 죽었다\" (\"thwacked the desk and he dropped dead\") is a byword for state violence; avoid \"탁\"/thwack or table-slamming copy, water-torture or interrogation imagery. Starbucks Korea's 2026 \"Thwack it on the table!\" slogan was read as this reference.",
    sourceUrl: "https://en.wikipedia.org/wiki/Park_Jong-chul",
  },
  {
    id: "kr-march-1-independence-movement",
    market: "KR",
    label: "March 1st Independence Movement Day (Samiljeol, 1919)",
    dateRule: { type: "fixed", date: "03-01" },
    gravity: "solemn",
    guidance:
      "Commemorates the 1919 uprising against Japanese colonial rule; avoid Japanese-themed promotions, Rising Sun motifs and anything that could read as colonial nostalgia. Patriotic Taegukgi and \"manse\" imagery is expected but must not be played for laughs or tied to discounts.",
    sourceUrl: "https://en.wikipedia.org/wiki/March_1st_Movement",
  },
  {
    id: "kr-jeju-april-3",
    market: "KR",
    label: "Jeju April 3 Incident memorial day (1948–1954)",
    dateRule: { type: "fixed", date: "04-03" },
    gravity: "solemn",
    guidance:
      "Tens of thousands of Jeju islanders were killed in anti-communist purges; the red camellia is the memorial symbol. Avoid decorative camellia motifs, festive Jeju-travel promotions and any \"red\"/commie jokes, especially in Jeju, where April 3 is a local public holiday.",
    sourceUrl: "https://en.wikipedia.org/wiki/Jeju_uprising",
  },
  {
    id: "kr-sewol-april-16",
    market: "KR",
    label: "Sewol ferry disaster anniversary (2014)",
    dateRule: { type: "fixed", date: "04-16" },
    gravity: "solemn",
    guidance:
      "304 people died, most of them Danwon High School students told over the tannoy to \"stay where you are\"; the yellow ribbon is the memorial symbol. Avoid ferries, capsizing or sinking imagery, school-trip themes, \"stay put\"/\"가만히 있으라\" copy and yellow-ribbon motifs used decoratively.",
    sourceUrl: "https://en.wikipedia.org/wiki/Sinking_of_MV_Sewol",
  },
  {
    id: "kr-april-revolution-april-19",
    market: "KR",
    label: "April 19 Revolution anniversary (1960)",
    dateRule: { type: "fixed", date: "04-19" },
    gravity: "solemn",
    guidance:
      "Student-led uprising that toppled Syngman Rhee after police fired on protesters. Avoid parodying student protesters, police-shooting imagery or \"revolution\" sale puns.",
    sourceUrl: "https://en.wikipedia.org/wiki/April_Revolution",
  },
  {
    id: "kr-gwangju-may-18",
    market: "KR",
    label: "May 18 Gwangju Democratization Movement anniversary (1980)",
    dateRule: { type: "fixed", date: "05-18" },
    gravity: "solemn",
    guidance:
      "Martial-law troops with tanks and paratroopers killed hundreds of civilians in Gwangju; \"5.18\" and \"518\" are themselves memorial symbols. Avoid tanks, armoured vehicles, soldiers or batons, the numbers 518/5.18 in prices, codes or product names, and anything \"Tank\"-named: Starbucks Korea's \"Tank Day\" tumbler launch on this date in 2026 was pulled within hours and the CEO was fired.",
    sourceUrl: "https://en.wikipedia.org/wiki/Gwangju_Uprising",
  },
  {
    id: "kr-memorial-day-june-6",
    market: "KR",
    label: "Memorial Day (Hyeonchungil)",
    dateRule: { type: "fixed", date: "06-06" },
    gravity: "solemn",
    guidance:
      "National day of mourning for the war dead: flags fly at half-mast and a siren sounds at 10:00 for a minute's silence. Avoid party, festival or \"celebrate the day off\" promotions, holiday-sale framing and military-themed humour.",
    sourceUrl: "https://en.wikipedia.org/wiki/Memorial_Day_(South_Korea)",
  },
  {
    id: "kr-june-democratic-struggle-june-10",
    market: "KR",
    label: "June Democratic Struggle anniversary (1987)",
    dateRule: { type: "fixed", date: "06-10" },
    gravity: "solemn",
    guidance:
      "Nationwide protests triggered by Park Jong-chul's torture death, and by student Lee Han-yeol being struck by a tear-gas canister, forced direct presidential elections. Avoid tear-gas or smoke-grenade imagery, riot-police parody and \"탁\" (thwack) wordplay.",
    sourceUrl: "https://en.wikipedia.org/wiki/June_Democratic_Struggle",
  },
  {
    id: "kr-korean-war-june-25",
    market: "KR",
    label: "Korean War outbreak anniversary (1950)",
    dateRule: { type: "fixed", date: "06-25" },
    gravity: "solemn",
    guidance:
      "Anniversary of North Korea's 1950 invasion. Avoid war-game or combat-themed promotions, refugee or bombing imagery, and jokes about North Korea or reunification.",
    sourceUrl: "https://en.wikipedia.org/wiki/Korean_War",
  },
  {
    id: "kr-comfort-women-aug-14",
    market: "KR",
    label: "Memorial Day for Japanese military \"comfort women\" victims",
    dateRule: { type: "fixed", date: "08-14" },
    gravity: "solemn",
    guidance:
      "Marks Kim Hak-sun's 1991 public testimony about wartime sexual slavery. Avoid the Statue of Peace (girl statue) as a visual device, sexualised young women in Japanese-style costume, and any \"that was long ago\" framing: UNIQLO pulled a 2019 Korean ad whose \"80 years ago\" subtitle was read as mocking the victims.",
    sourceUrl: "https://en.wikipedia.org/wiki/Comfort_women",
  },
  {
    id: "kr-liberation-day-aug-15",
    market: "KR",
    label: "Liberation Day (Gwangbokjeol, 1945)",
    dateRule: { type: "fixed", date: "08-15" },
    gravity: "celebratory",
    guidance:
      "Celebrates the end of Japanese colonial rule. Japanese brands, Japan-travel offers and Rising Sun or imperial motifs draw boycott calls; patriotic Taegukgi campaigns are welcome but must not trivialise the independence struggle.",
    sourceUrl: "https://en.wikipedia.org/wiki/National_Liberation_Day_of_Korea",
  },
  {
    id: "kr-national-humiliation-aug-29",
    market: "KR",
    label: "National Humiliation Day (Gyeongsul Gukchi, 1910 annexation)",
    dateRule: { type: "fixed", date: "08-29" },
    gravity: "solemn",
    guidance:
      "Anniversary of Japan's annexation of Korea. Avoid Japan-themed promotions and \"merger\", \"annexation\" or \"union\" wordplay in Korea-Japan brand partnerships.",
    sourceUrl: "https://en.wikipedia.org/wiki/Japan%E2%80%93Korea_Treaty_of_1910",
  },
  {
    id: "kr-itaewon-crowd-crush-oct-29",
    market: "KR",
    label: "Itaewon Halloween crowd crush anniversary (2022)",
    dateRule: { type: "fixed", date: "10-29" },
    gravity: "solemn",
    guidance:
      "159 people died in a crowded alley during Halloween celebrations in Seoul's Itaewon; many Korean brands have scaled back Halloween since. Avoid crowd or packed-street imagery, Halloween-party and costume promotions tied to Itaewon, and \"crushing it\"/\"packed\" copy in late October.",
    sourceUrl: "https://en.wikipedia.org/wiki/2022_Seoul_Halloween_crowd_crush",
  },
  {
    id: "kr-jeju-air-2216-dec-29",
    market: "KR",
    label: "Jeju Air Flight 2216 crash at Muan anniversary (2024)",
    dateRule: { type: "fixed", date: "12-29" },
    gravity: "solemn",
    guidance:
      "179 of 181 people died when the Boeing 737 belly-landed at Muan International Airport and hit the localizer embankment after a reported bird strike. Avoid plane, runway or crash-landing imagery, bird-strike jokes and \"fly away\"/\"soft landing\" year-end travel copy.",
    sourceUrl: "https://en.wikipedia.org/wiki/Jeju_Air_Flight_2216",
  },
  {
    id: "kr-seollal",
    market: "KR",
    label: "Seollal (Lunar New Year holiday)",
    dateRule: {
      type: "variable",
      note: "First day of the first month of the Korean lunisolar calendar (KASI), plus the day before and after, with a substitute holiday when it overlaps a Sunday. Windows cover the official holiday period; confirm against the government's public-holiday announcement.",
      approximate: w(
        ["2025-01-28", "2025-01-30"],
        ["2026-02-16", "2026-02-18"],
        ["2027-02-06", "2027-02-09"],
        ["2028-01-26", "2028-01-28"],
        ["2029-02-12", "2029-02-14"],
        ["2030-02-02", "2030-02-05"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Peak gift-set season and a family ancestral-rite (charye) holiday with mass travel. Avoid sets or prices built on the number 4 (homophone of \"death\"), and plan around courier cut-offs and store closures.",
    sourceUrl: "https://en.wikipedia.org/wiki/Korean_New_Year",
  },
  {
    id: "kr-buddhas-birthday",
    market: "KR",
    label: "Buddha's Birthday (Bucheonim Osinnal)",
    dateRule: {
      type: "variable",
      note: "Eighth day of the fourth month of the Korean lunisolar calendar, plus a substitute holiday when it falls on a weekend. Confirm against the government's public-holiday announcement.",
      approximate: w(
        ["2025-05-05", "2025-05-06"],
        ["2026-05-24", "2026-05-25"],
        ["2027-05-13", "2027-05-13"],
        ["2028-05-02", "2028-05-02"],
        ["2029-05-20", "2029-05-21"],
        ["2030-05-09", "2030-05-09"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "Temples hold lantern festivals (Yeondeunghoe). Do not put Buddha images or temple iconography on alcohol, meat or footwear, and avoid treating lanterns or monks as party props.",
    sourceUrl: "https://en.wikipedia.org/wiki/Buddha%27s_Birthday",
  },
  {
    id: "kr-chuseok",
    market: "KR",
    label: "Chuseok (harvest festival holiday)",
    dateRule: {
      type: "variable",
      note: "15th day of the eighth month of the Korean lunisolar calendar, plus the day before and after, with a substitute holiday when it overlaps a Sunday or another holiday. Confirm against the government's public-holiday announcement.",
      approximate: w(
        ["2025-10-05", "2025-10-08"],
        ["2026-09-24", "2026-09-26"],
        ["2027-09-14", "2027-09-16"],
        ["2028-10-02", "2028-10-05"],
        ["2029-09-21", "2029-09-24"],
        ["2030-09-11", "2030-09-13"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Major gifting and ancestral-rite holiday with mass travel. Avoid sets or prices of 4, and campaigns that mock charye or family-visit obligations in ways read as disrespecting ancestors.",
    sourceUrl: "https://en.wikipedia.org/wiki/Chuseok",
  },

  /* ============================== CN ============================== */
  {
    id: "cn-spring-festival",
    market: "CN",
    label: "Spring Festival (Lunar New Year) statutory holiday",
    dateRule: {
      type: "variable",
      note: "Lunar New Year falls on the second new moon after the winter solstice (21 Jan–20 Feb). The State Council announces the statutory holiday and make-up working days each November; 2025 and 2026 windows are official, later years estimate New Year's Eve to the seventh day.",
      approximate: w(
        ["2025-01-28", "2025-02-04"],
        ["2026-02-15", "2026-02-23"],
        ["2027-02-05", "2027-02-12"],
        ["2028-01-25", "2028-02-01"],
        ["2029-02-12", "2029-02-19"],
        ["2030-02-02", "2030-02-09"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Peak red-envelope and gifting season. Avoid clocks as gifts (送钟 sounds like \"attending a funeral\"), the number 4, white or black gift packaging, and zodiac-animal art that reads as a caricature of Chinese people.",
    sourceUrl: "https://en.wikipedia.org/wiki/Chinese_New_Year",
  },
  {
    id: "cn-qingming",
    market: "CN",
    label: "Qingming Festival (Tomb-Sweeping Day)",
    dateRule: {
      type: "variable",
      note: "Set by the Qingming solar term (April 4 or 5); the State Council fixes the surrounding statutory holiday each year. 2025 and 2026 windows are official; later years are the solar-term day ±1.",
      approximate: w(
        ["2025-04-04", "2025-04-06"],
        ["2026-04-04", "2026-04-06"],
        ["2027-04-04", "2027-04-06"],
        ["2028-04-03", "2028-04-05"],
        ["2029-04-03", "2029-04-05"],
        ["2030-04-04", "2030-04-06"],
      ),
    },
    gravity: "solemn",
    guidance:
      "Families sweep graves and honour the dead: \"Happy Qingming\" (清明节快乐) greetings and festive red sale graphics read as tone-deaf. Avoid chrysanthemums (funeral flowers) in promotional contexts, and ghost or grave jokes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Qingming_Festival",
  },
  {
    id: "cn-wenchuan-earthquake-may-12",
    market: "CN",
    label: "Wenchuan earthquake anniversary / National Disaster Prevention and Reduction Day (2008)",
    dateRule: { type: "fixed", date: "05-12" },
    gravity: "solemn",
    guidance:
      "About 69,000 people died in the Sichuan earthquake, many of them children in collapsed schools. Avoid \"shake\"/earthquake puns, collapsing-building imagery and \"5.12\" promo codes.",
    sourceUrl: "https://en.wikipedia.org/wiki/2008_Sichuan_earthquake",
  },
  {
    id: "cn-june-4",
    market: "CN",
    label: "June 4 (1989 Tiananmen crackdown), censored anniversary",
    dateRule: { type: "fixed", date: "06-04" },
    gravity: "contested",
    guidance:
      "The date is heavily censored in the mainland: \"6.4\", \"六四\", \"May 35\" (五月三十五日), \"8964\", candles, tanks, lines of vehicles and the \"Tank Man\" pose all trigger takedowns. Avoid tank-shaped products and those numbers in prices or codes: livestreamer Li Jiaqi's broadcast was cut on June 3, 2022 after a tank-shaped ice-cream cake appeared.",
    sourceUrl: "https://en.wikipedia.org/wiki/1989_Tiananmen_Square_protests_and_massacre",
  },
  {
    id: "cn-marco-polo-bridge-jul-7",
    market: "CN",
    label: "Marco Polo Bridge Incident anniversary (July 7, 1937)",
    dateRule: { type: "fixed", date: "07-07" },
    gravity: "solemn",
    guidance:
      "Marks the start of the full-scale War of Resistance against Japan. Avoid Japanese military or Rising Sun motifs, kimono or samurai styling, and Japan-themed launches or collaborations on this date.",
    sourceUrl: "https://en.wikipedia.org/wiki/Marco_Polo_Bridge_incident",
  },
  {
    id: "cn-victory-day-sep-3",
    market: "CN",
    label: "Victory Day of the War of Resistance against Japanese Aggression",
    dateRule: { type: "fixed", date: "09-03" },
    gravity: "solemn",
    guidance:
      "Official commemoration of the 1945 victory, with military parades in milestone years such as 2015 and 2025. Avoid Japanese wartime imagery, and any war-parody or military-cosplay content that could be read as mocking the war dead.",
    sourceUrl: "https://en.wikipedia.org/wiki/Victory_over_Japan_Day",
  },
  {
    id: "cn-mukden-incident-sep-18",
    market: "CN",
    label: "September 18 (Mukden Incident, 1931) remembrance",
    dateRule: { type: "fixed", date: "09-18" },
    gravity: "solemn",
    guidance:
      "Air-raid sirens sound in Shenyang, Harbin and other cities, many at 9:18. Avoid \"9.18\" or \"918\" sale codes, Japanese-themed promotions and explosion or railway-sabotage imagery.",
    sourceUrl: "https://en.wikipedia.org/wiki/Mukden_incident",
  },
  {
    id: "cn-national-day-golden-week",
    market: "CN",
    label: "National Day Golden Week",
    dateRule: { type: "range", start: "10-01", end: "10-07" },
    gravity: "celebratory",
    guidance:
      "Peak travel and retail week. China's advertising law bars using the national flag, anthem or emblem in commercial ads, and any map must show Taiwan and the South China Sea islands as Chinese territory.",
    sourceUrl: "https://en.wikipedia.org/wiki/Golden_Week_(China)",
  },
  {
    id: "cn-singles-day-nov-11",
    market: "CN",
    label: "Singles' Day (Double 11) shopping festival",
    dateRule: { type: "fixed", date: "11-11" },
    gravity: "celebratory",
    guidance:
      "Largest e-commerce event; Alibaba holds the \"双十一\" trademark, so other brands typically use generic wording. Regulators scrutinise \"raise-then-discount\" fake pricing, and copy that shames people for being single now lands badly.",
    sourceUrl: "https://en.wikipedia.org/wiki/Singles%27_Day",
  },
  {
    id: "cn-nanjing-massacre-dec-13",
    market: "CN",
    label: "Nanjing Massacre National Memorial Day (1937)",
    dateRule: { type: "fixed", date: "12-13" },
    gravity: "solemn",
    guidance:
      "State memorial day with sirens in Nanjing at 10:00. Avoid Japanese cultural themes (kimono events, samurai or sakura campaigns), sword or bayonet imagery, and any celebratory promotion, especially in Jiangsu.",
    sourceUrl: "https://en.wikipedia.org/wiki/Nanjing_Massacre",
  },

  /* ============================== JP ============================== */
  {
    id: "jp-hanshin-earthquake-jan-17",
    market: "JP",
    label: "Great Hanshin-Awaji Earthquake anniversary (1995)",
    dateRule: { type: "fixed", date: "01-17" },
    gravity: "solemn",
    guidance:
      "Kobe observes a moment of silence at 5:46 a.m. for about 6,400 dead. Avoid \"shaking\" or earthquake puns, collapsed-expressway or fire imagery, and disaster-kit sales framed as a tie-in to the anniversary.",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Hanshin_earthquake",
  },
  {
    id: "jp-tohoku-earthquake-mar-11",
    market: "JP",
    label: "Great East Japan Earthquake and tsunami anniversary (2011)",
    dateRule: { type: "fixed", date: "03-11" },
    gravity: "solemn",
    guidance:
      "Nationwide silence at 14:46 for about 20,000 dead and missing; many broadcasters and brands pull entertainment ads. Avoid waves, \"tsunami of savings\" copy, radiation or Fukushima food jokes, and cheerful launches on the day.",
    sourceUrl: "https://en.wikipedia.org/wiki/2011_T%C5%8Dhoku_earthquake_and_tsunami",
  },
  {
    id: "jp-tokyo-sarin-attack-mar-20",
    market: "JP",
    label: "Tokyo subway sarin attack anniversary (1995)",
    dateRule: { type: "fixed", date: "03-20" },
    gravity: "solemn",
    guidance:
      "Aum Shinrikyo released sarin on rush-hour trains; Tokyo Metro staff hold a silence at Kasumigaseki station. Avoid poison-gas or gas-mask imagery, cult parody and \"deadly commute\" copy in subway advertising.",
    sourceUrl: "https://en.wikipedia.org/wiki/Tokyo_subway_sarin_attack",
  },
  {
    id: "jp-okinawa-memorial-day-jun-23",
    market: "JP",
    label: "Okinawa Memorial Day (Irei no Hi), end of the Battle of Okinawa",
    dateRule: { type: "fixed", date: "06-23" },
    gravity: "solemn",
    guidance:
      "Okinawa Prefecture holiday with a noon silence for more than 200,000 dead, roughly half of them civilians. Avoid military, beach-landing or battle imagery and resort-party promotions targeted at Okinawa on the day, and treat US-base themes with care.",
    sourceUrl: "https://en.wikipedia.org/wiki/Battle_of_Okinawa",
  },
  {
    id: "jp-hiroshima-aug-6",
    market: "JP",
    label: "Hiroshima atomic bombing anniversary (1945)",
    dateRule: { type: "fixed", date: "08-06" },
    gravity: "solemn",
    guidance:
      "Peace Memorial Ceremony with a silence at 8:15. Avoid mushroom clouds, flash or explosion imagery, and \"bomb\" sale wordplay such as 爆安 or 爆売れ (\"explosively cheap\", \"explosive sales\"); a 2018 T-shirt mixing atomic-bomb imagery with liberation slogans caused a cross-border BTS controversy.",
    sourceUrl: "https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki",
  },
  {
    id: "jp-nagasaki-aug-9",
    market: "JP",
    label: "Nagasaki atomic bombing anniversary (1945)",
    dateRule: { type: "fixed", date: "08-09" },
    gravity: "solemn",
    guidance:
      "Peace ceremony with a silence at 11:02. Avoid mushroom clouds, explosion imagery and \"bomb\" (爆) wordplay in copy.",
    sourceUrl: "https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki",
  },
  {
    id: "jp-obon",
    market: "JP",
    label: "Obon (festival of the ancestors)",
    dateRule: { type: "range", start: "08-13", end: "08-16" },
    gravity: "religious-observance",
    guidance:
      "Families welcome returning ancestral spirits with grave visits, mukaebi fires and Bon Odori. Most regions observe Aug 13–16, but parts of Tokyo and Kanagawa hold \"July Bon\" (Jul 13–16) and Okinawa follows the lunar calendar (late Aug–Sept). Expect business closures and travel peaks, and avoid horror or \"ghost\" gags aimed at ancestors or grave sites.",
    sourceUrl: "https://en.wikipedia.org/wiki/Bon_Festival",
  },
  {
    id: "jp-end-of-war-aug-15",
    market: "JP",
    label: "Day for mourning the war dead and praying for peace (end of WWII)",
    dateRule: { type: "fixed", date: "08-15" },
    gravity: "solemn",
    guidance:
      "National memorial service with a noon silence; the same day is Liberation Day in Korea. Avoid military nostalgia, the Rising Sun flag and Yasukuni-related imagery, which also cause backlash in KR and CN campaigns that run at the same time.",
    sourceUrl: "https://en.wikipedia.org/wiki/Surrender_of_Japan",
  },
  {
    id: "jp-kanto-earthquake-sep-1",
    market: "JP",
    label: "Disaster Prevention Day (Great Kantō earthquake, 1923)",
    dateRule: { type: "fixed", date: "09-01" },
    gravity: "solemn",
    guidance:
      "Nationwide drills mark the quake that killed more than 100,000 people, after which mobs massacred Korean residents, a sensitive memory in Korea. Avoid earthquake or fire puns, and never frame the day as a sales hook.",
    sourceUrl: "https://en.wikipedia.org/wiki/1923_Great_Kant%C5%8D_earthquake",
  },

  /* ============================== IN ============================== */
  {
    id: "in-republic-day-jan-26",
    market: "IN",
    label: "Republic Day",
    dateRule: { type: "fixed", date: "01-26" },
    gravity: "celebratory",
    guidance:
      "A national dry day in most states, so no alcohol promotions. The Flag Code and the Emblems and Names Act bar putting the tricolour or the Ashoka emblem on disposable goods, clothing below the waist or commercial branding.",
    sourceUrl: "https://en.wikipedia.org/wiki/Republic_Day_(India)",
  },
  {
    id: "in-martyrs-day-jan-30",
    market: "IN",
    label: "Martyrs' Day (Shaheed Diwas), Gandhi's assassination",
    dateRule: { type: "fixed", date: "01-30" },
    gravity: "solemn",
    guidance:
      "Two minutes' silence at 11:00. Avoid Gandhi caricatures, gun or assassination imagery and any glorification of Nathuram Godse, a live political flashpoint.",
    sourceUrl: "https://en.wikipedia.org/wiki/Martyrs%27_Day_(India)",
  },
  {
    id: "in-pulwama-feb-14",
    market: "IN",
    label: "Pulwama attack anniversary (2019)",
    dateRule: { type: "fixed", date: "02-14" },
    gravity: "solemn",
    guidance:
      "40 CRPF personnel were killed by a suicide car bomb on Valentine's Day, and Valentine's campaigns now regularly draw \"Black Day\" backlash. Avoid military-convoy or blast imagery and \"love bomb\"/\"explosive offer\" copy, and keep Valentine's messaging low-key.",
    sourceUrl: "https://en.wikipedia.org/wiki/2019_Pulwama_attack",
  },
  {
    id: "in-jallianwala-bagh-apr-13",
    market: "IN",
    label: "Jallianwala Bagh massacre anniversary (1919)",
    dateRule: { type: "fixed", date: "04-13" },
    gravity: "solemn",
    guidance:
      "British troops fired on a Baisakhi gathering in Amritsar, and the harvest festival still falls on the same day. Baisakhi celebration is fine, but avoid \"firing\"/\"shoot\" wordplay, colonial or Raj nostalgia, and walled-garden crowd imagery.",
    sourceUrl: "https://en.wikipedia.org/wiki/Jallianwala_Bagh_massacre",
  },
  {
    id: "in-pahalgam-apr-22",
    market: "IN",
    label: "Pahalgam terror attack anniversary (2025)",
    dateRule: { type: "fixed", date: "04-22" },
    gravity: "solemn",
    guidance:
      "Militants killed 26 people, mostly tourists singled out by religion, near Pahalgam, leading to India–Pakistan hostilities (\"Operation Sindoor\"). Avoid carefree Kashmir-tourism promos around the date and never use military operation names commercially: Reliance withdrew an \"Operation Sindoor\" trademark filing in 2025 after backlash.",
    sourceUrl: "https://en.wikipedia.org/wiki/2025_Pahalgam_attack",
  },
  {
    id: "in-independence-day-aug-15",
    market: "IN",
    label: "Independence Day",
    dateRule: { type: "fixed", date: "08-15" },
    gravity: "celebratory",
    guidance:
      "A national dry day; flag-use rules apply, so no tricolour on disposable packaging or as a sale backdrop. The day before is Partition Horrors Remembrance Day, so avoid Pakistan jokes and light treatment of Partition imagery.",
    sourceUrl: "https://en.wikipedia.org/wiki/Independence_Day_(India)",
  },
  {
    id: "in-gandhi-jayanti-oct-2",
    market: "IN",
    label: "Gandhi Jayanti",
    dateRule: { type: "fixed", date: "10-02" },
    gravity: "celebratory",
    guidance:
      "A national dry day: no alcohol promotions or bar events. Never put Gandhi's image on alcohol, footwear, doormats or novelty goods; Amazon pulled Gandhi-printed flip-flops in 2017 after government protests.",
    sourceUrl: "https://en.wikipedia.org/wiki/Gandhi_Jayanti",
  },
  {
    id: "in-mumbai-attacks-nov-26",
    market: "IN",
    label: "26/11 Mumbai terror attacks anniversary (2008)",
    dateRule: { type: "fixed", date: "11-26" },
    gravity: "solemn",
    guidance:
      "166 people died in attacks on the Taj hotel, CST station and other sites; the same date is Constitution Day. Avoid \"26/11\" in sale codes, Taj-dome or siege imagery, and gunfire or \"hostage\" wordplay.",
    sourceUrl: "https://en.wikipedia.org/wiki/2008_Mumbai_attacks",
  },
  {
    id: "in-babri-masjid-dec-6",
    market: "IN",
    label: "Babri Masjid demolition anniversary (1992) / Ambedkar Mahaparinirvan Diwas",
    dateRule: { type: "fixed", date: "12-06" },
    gravity: "contested",
    guidance:
      "Commemorated as \"Black Day\" by some Muslim groups and \"Shaurya Diwas\" by some Hindu groups, and also B. R. Ambedkar's death anniversary, when millions gather at Chaityabhoomi in Mumbai. Avoid mosque or temple imagery, \"demolition\"/\"smashing prices\" copy, and any Ambedkar caricature.",
    sourceUrl: "https://en.wikipedia.org/wiki/Demolition_of_the_Babri_Masjid",
  },
  {
    id: "in-holi",
    market: "IN",
    label: "Holi (Holika Dahan and Rangwali Holi)",
    dateRule: {
      type: "variable",
      note: "Holika Dahan is held on Phalguna Purnima (full moon) and colour-play Holi the next day, per the Hindu lunisolar calendar; the date depends on local tithi timings and can differ by a day between panchangs. Windows follow Drik Panchang (New Delhi); confirm locally.",
      approximate: w(
        ["2025-03-13", "2025-03-14"],
        ["2026-03-03", "2026-03-04"],
        ["2027-03-21", "2027-03-22"],
        ["2028-03-10", "2028-03-11"],
        ["2029-02-28", "2029-03-01"],
        ["2030-03-19", "2030-03-20"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Avoid \"bura na mano, Holi hai\" framing that excuses drenching or groping unwilling women, and water-wastage visuals in drought years. Interfaith storylines draw organised boycott campaigns, as Surf Excel's 2019 Holi ad did.",
    sourceUrl: "https://en.wikipedia.org/wiki/Holi",
  },
  {
    id: "in-navratri",
    market: "IN",
    label: "Sharad Navratri to Dussehra (Vijayadashami)",
    dateRule: {
      type: "variable",
      note: "Nine nights starting on Ashvin Shukla Pratipada in the Hindu lunisolar calendar, ending with Vijayadashami; an intercalary month (adhik maas) pushes some years about three weeks later. Windows follow Drik Panchang (New Delhi); confirm locally.",
      approximate: w(
        ["2025-09-22", "2025-10-02"],
        ["2026-10-11", "2026-10-20"],
        ["2027-09-30", "2027-10-09"],
        ["2028-09-19", "2028-09-28"],
        ["2029-10-08", "2029-10-16"],
        ["2030-09-28", "2030-10-06"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "Many Hindus fast or go vegetarian (often no onion, garlic or alcohol), so meat, alcohol or egg promotions in North and West India land badly. The same period is Durga Puja in Bengal, where non-vegetarian feasting is traditional, so segment by region. Never depict the goddess in revealing or comic styling.",
    sourceUrl: "https://en.wikipedia.org/wiki/Navaratri",
  },
  {
    id: "in-diwali",
    market: "IN",
    label: "Diwali (Dhanteras to Bhai Dooj)",
    dateRule: {
      type: "variable",
      note: "Lakshmi Puja falls on the Amavasya (new moon) of Kartika (amanta reckoning), inside a five-day festival from Dhanteras to Bhai Dooj; some years regions split across two evenings. Windows follow Drik Panchang (New Delhi) main dates ±2–3 days; confirm locally.",
      approximate: w(
        ["2025-10-18", "2025-10-23"],
        ["2026-11-06", "2026-11-11"],
        ["2027-10-27", "2027-11-01"],
        ["2028-10-15", "2028-10-20"],
        ["2029-11-03", "2029-11-08"],
        ["2030-10-24", "2030-10-29"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Firecracker sales and use are restricted in Delhi-NCR and other states by court order, so avoid cracker-bursting hero imagery there. Never print Lakshmi or Ganesh on footwear, alcohol or items thrown away. Cultural framing is politically charged: Tanishq (2020, interfaith baby shower) and Fabindia (2021, Urdu \"Jashn-e-Riwaaz\" name) both withdrew festive campaigns.",
    sourceUrl: "https://en.wikipedia.org/wiki/Diwali",
  },
  {
    id: "in-eid-al-fitr",
    market: "IN",
    label: "Eid al-Fitr (Eid ul-Fitr)",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} India's local sighting often places Eid one day after Saudi Arabia.`,
      approximate: w(...EID_AL_FITR),
    },
    gravity: "celebratory",
    guidance:
      "Keep alcohol and pork out of Eid creative, and show crescent, mosque or prayer imagery accurately, never as a party backdrop. Communal-harmony storylines attract organised trolling, so review casting and captions with Muslim creators.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Fitr",
  },
  {
    id: "in-muharram-ashura",
    market: "IN",
    label: "Muharram (Ashura), Shia mourning for Imam Husayn",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} The window runs from 1 Muharram to Ashura (10 Muharram, India's public holiday), the ten-day mourning period.`,
      approximate: w(
        ["2025-06-26", "2025-07-06"],
        ["2026-06-16", "2026-06-26"],
        ["2027-06-06", "2027-06-16"],
        ["2028-05-25", "2028-06-04"],
        ["2029-05-14", "2029-05-24"],
        ["2030-05-04", "2030-05-14"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "Ashura is a day of mourning, not a festival: never post \"Happy Muharram\" (a recurring gaffe by brands and politicians). Avoid music-led festive creative, and never use processions or self-flagellation as spectacle.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ashura",
  },

  /* ============================== SA ============================== */
  {
    id: "sa-founding-day-feb-22",
    market: "SA",
    label: "Founding Day (1727, Imam Muhammad bin Saud)",
    dateRule: { type: "fixed", date: "02-22" },
    gravity: "celebratory",
    guidance:
      "Distinct from National Day (Sept 23); mixing up the two, or the 1727 and 1932 dates, is a common and noticed error. Saudi rules bar the flag, which carries the Shahada, from trademarks and commercial advertising, so use heritage motifs (Diriyah, Najdi architecture) instead.",
    sourceUrl: "https://en.wikipedia.org/wiki/Saudi_Founding_Day",
  },
  {
    id: "sa-flag-day-mar-11",
    market: "SA",
    label: "Flag Day",
    dateRule: { type: "fixed", date: "03-11" },
    gravity: "celebratory",
    guidance:
      "The Interior Ministry prohibits using the flag in trademarks or commercial advertising. Because it bears the Shahada it is never flown at half-mast, altered or printed on disposable items, apparel or footwear.",
    sourceUrl:
      "https://saudigazette.com.sa/article/655199/SAUDI-ARABIA/Interior-Ministry-It-is-prohibited-to-use-Saudi-flag-as-a-trademark-or-for-commercial-purposes",
  },
  {
    id: "sa-national-day-sep-23",
    market: "SA",
    label: "Saudi National Day (unification, 1932)",
    dateRule: { type: "fixed", date: "09-23" },
    gravity: "celebratory",
    guidance:
      "Green-themed promotions are expected, but Saudi rules ban using the flag and national, religious or sectarian symbols in commercial products and ads. Keep the Shahada off cups, bags and anything discarded, and don't conflate the day with Founding Day.",
    sourceUrl: "https://en.wikipedia.org/wiki/Saudi_National_Day",
  },
  {
    id: "sa-ramadan",
    market: "SA",
    label: "Ramadan",
    dateRule: { type: "variable", note: ISLAMIC_NOTE, approximate: w(...RAMADAN) },
    gravity: "religious-observance",
    guidance:
      "Do not show eating, drinking or smoking in daytime settings; public consumption during fasting hours is restricted. Tone down music and sexualised styling, schedule food ads for iftar and suhoor, and never pair Ramadan motifs with diet or \"burn calories\" copy.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ramadan",
  },
  {
    id: "sa-eid-al-fitr",
    market: "SA",
    label: "Eid al-Fitr",
    dateRule: { type: "variable", note: ISLAMIC_NOTE, approximate: w(...EID_AL_FITR) },
    gravity: "celebratory",
    guidance:
      "Gifting (eidiya) and family-visit season. Keep Quranic text, the Kaaba and mosque imagery off packaging and promotional giveaways, and keep dance and music creative within local norms.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Fitr",
  },
  {
    id: "sa-hajj",
    market: "SA",
    label: "Hajj pilgrimage days (8–13 Dhu al-Hijjah)",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} Saudi Arabia's Supreme Court announces the start of Dhu al-Hijjah; 2025 and 2026 windows match those announcements. Hajj logistics (permits, Makkah entry restrictions) start weeks earlier.`,
      approximate: w(
        ["2025-06-04", "2025-06-09"],
        ["2026-05-25", "2026-05-30"],
        ["2027-05-14", "2027-05-19"],
        ["2028-05-03", "2028-05-08"],
        ["2029-04-22", "2029-04-27"],
        ["2030-04-11", "2030-04-16"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "Never stage shoots in or suggest non-Muslim access to Makkah, or put the Kaaba on products. Avoid pilgrim-crowd humour (crowd disasters such as the 2015 Mina crush are remembered), and never promote unlicensed Hajj packages or \"Hajj without a permit\".",
    sourceUrl: "https://en.wikipedia.org/wiki/Hajj",
  },
  {
    id: "sa-eid-al-adha",
    market: "SA",
    label: "Eid al-Adha (with the Day of Arafah)",
    dateRule: { type: "variable", note: ISLAMIC_NOTE, approximate: w(...EID_AL_ADHA) },
    gravity: "celebratory",
    guidance:
      "Sacrifice-animal imagery should be respectful, with no gore and no cartoon sheep being \"saved\" from slaughter. Arafah (the day before) is a fasting day for many, so hold food-led promotions until Eid itself.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Adha",
  },

  /* ============================== US ============================== */
  {
    id: "us-mlk-day",
    market: "US",
    label: "Martin Luther King Jr. Day",
    dateRule: {
      type: "variable",
      note: "Third Monday of January (federal holiday). Computed, not estimated; flagged for verification like every variable entry.",
      approximate: w(
        ["2025-01-20", "2025-01-20"],
        ["2026-01-19", "2026-01-19"],
        ["2027-01-18", "2027-01-18"],
        ["2028-01-17", "2028-01-17"],
        ["2029-01-15", "2029-01-15"],
        ["2030-01-21", "2030-01-21"],
      ),
    },
    gravity: "solemn",
    guidance:
      "A day of service honouring an assassinated civil-rights leader. Don't use King's voice, image or quotes to sell (Ram Trucks' 2018 Super Bowl ad using his \"Drum Major Instinct\" sermon drew wide condemnation) and avoid \"MLK Day Sale\" framing.",
    sourceUrl: "https://en.wikipedia.org/wiki/Martin_Luther_King_Jr._Day",
  },
  {
    id: "us-oklahoma-city-bombing-apr-19",
    market: "US",
    label: "Oklahoma City bombing anniversary (1995)",
    dateRule: { type: "fixed", date: "04-19" },
    gravity: "solemn",
    guidance:
      "168 people died, including 19 children; the remembrance ceremony holds 168 seconds of silence from 9:02 a.m. Avoid truck-bomb or explosion imagery and anti-government militia aesthetics, especially in Oklahoma.",
    sourceUrl: "https://en.wikipedia.org/wiki/Oklahoma_City_bombing",
  },
  {
    id: "us-columbine-apr-20",
    market: "US",
    label: "Columbine High School massacre anniversary (1999)",
    dateRule: { type: "fixed", date: "04-20" },
    gravity: "solemn",
    guidance:
      "13 people were killed at the Colorado school on the same date as \"4/20\" cannabis marketing. Keep 4/20 promotions away from school, trench-coat or gun imagery and from youth-targeted channels.",
    sourceUrl: "https://en.wikipedia.org/wiki/Columbine_High_School_massacre",
  },
  {
    id: "us-memorial-day",
    market: "US",
    label: "Memorial Day",
    dateRule: {
      type: "variable",
      note: "Last Monday of May (federal holiday). Computed, not estimated; flagged for verification like every variable entry.",
      approximate: w(
        ["2025-05-26", "2025-05-26"],
        ["2026-05-25", "2026-05-25"],
        ["2027-05-31", "2027-05-31"],
        ["2028-05-29", "2028-05-29"],
        ["2029-05-28", "2029-05-28"],
        ["2030-05-27", "2030-05-27"],
      ),
    },
    gravity: "solemn",
    guidance:
      "Honours service members who died in service; \"Happy Memorial Day\" and mattress-sale framing are routinely criticised. Never use flag-draped coffins, Arlington headstones or real service members' images in sale creative, and don't confuse it with Veterans Day.",
    sourceUrl: "https://en.wikipedia.org/wiki/Memorial_Day",
  },
  {
    id: "us-juneteenth-jun-19",
    market: "US",
    label: "Juneteenth National Independence Day",
    dateRule: { type: "fixed", date: "06-19" },
    gravity: "celebratory",
    guidance:
      "Commemorates the end of slavery in Texas in 1865. Avoid novelty merchandise (Walmart recalled its 2022 \"Celebration Edition\" Juneteenth ice cream), food stereotypes such as watermelon or fried chicken, and generic red-white-blue July 4 creative.",
    sourceUrl: "https://en.wikipedia.org/wiki/Juneteenth",
  },
  {
    id: "us-independence-day-jul-4",
    market: "US",
    label: "Independence Day",
    dateRule: { type: "fixed", date: "07-04" },
    gravity: "celebratory",
    guidance:
      "Patriotic promotions are the norm. The US Flag Code, though unenforced, discourages printing the flag on disposable items and apparel, which draws veteran complaints, and showing unsafe backyard fireworks invites criticism.",
    sourceUrl: "https://en.wikipedia.org/wiki/Independence_Day_(United_States)",
  },
  {
    id: "us-september-11",
    market: "US",
    label: "September 11 attacks anniversary (2001)",
    dateRule: { type: "fixed", date: "09-11" },
    gravity: "solemn",
    guidance:
      "Never tie 9/11 to a sale or product: AT&T's 2013 \"Never Forget\" phone-photo post and a Texas mattress store's 2016 \"Twin Towers\" sale video both caused national outrage. Avoid tower, plane or skyline-smoke imagery and \"9/11\" in codes or prices.",
    sourceUrl: "https://en.wikipedia.org/wiki/September_11_attacks",
  },
  {
    id: "us-veterans-day-nov-11",
    market: "US",
    label: "Veterans Day",
    dateRule: { type: "fixed", date: "11-11" },
    gravity: "solemn",
    guidance:
      "Honours all who served, living and dead; veteran discounts are welcome. Avoid Memorial Day's \"fallen\" framing, actors in unauthorised uniforms or medals (stolen-valour backlash), and war-game promotions.",
    sourceUrl: "https://en.wikipedia.org/wiki/Veterans_Day",
  },
  {
    id: "us-thanksgiving",
    market: "US",
    label: "Thanksgiving (and Native American National Day of Mourning)",
    dateRule: {
      type: "variable",
      note: "Fourth Thursday of November (federal holiday). Computed, not estimated; flagged for verification like every variable entry.",
      approximate: w(
        ["2025-11-27", "2025-11-27"],
        ["2026-11-26", "2026-11-26"],
        ["2027-11-25", "2027-11-25"],
        ["2028-11-23", "2028-11-23"],
        ["2029-11-22", "2029-11-22"],
        ["2030-11-28", "2030-11-28"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Many Native Americans observe the same day as a National Day of Mourning (Plymouth, since 1970). Avoid \"Pilgrims and Indians\" costumes, feather headdresses and happy-colonist narratives, and note that Black Friday creative launched on the holiday itself draws worker-welfare criticism.",
    sourceUrl: "https://en.wikipedia.org/wiki/Thanksgiving_(United_States)",
  },
  {
    id: "us-pearl-harbor-dec-7",
    market: "US",
    label: "National Pearl Harbor Remembrance Day (1941)",
    dateRule: { type: "fixed", date: "12-07" },
    gravity: "solemn",
    guidance:
      "Flags fly at half-staff; ceremonies at Pearl Harbor pause at 7:55 a.m. Hawaii time. Avoid \"bombing\"/\"surprise attack\" sale puns, Japanese military imagery and Japan-themed launches, especially in Hawaii.",
    sourceUrl: "https://en.wikipedia.org/wiki/National_Pearl_Harbor_Remembrance_Day",
  },

  /* ============================== MX ============================== */
  {
    id: "mx-semana-santa",
    market: "MX",
    label: "Semana Santa (Holy Week)",
    dateRule: {
      type: "variable",
      note: "Palm Sunday to Easter Sunday, following Western (Gregorian) Easter. Computed, not estimated; Holy Thursday and Good Friday are the main days off, and many schools break for two weeks.",
      approximate: w(
        ["2025-04-13", "2025-04-20"],
        ["2026-03-29", "2026-04-05"],
        ["2027-03-21", "2027-03-28"],
        ["2028-04-09", "2028-04-16"],
        ["2029-03-25", "2029-04-01"],
        ["2030-04-14", "2030-04-21"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "Processions and Passion plays (such as Iztapalapa's) are sacred, so avoid irreverent crucifixion or Jesus humour. Many Catholics avoid meat on Good Friday; beach-vacation promotions are normal, but keep them clear of religious imagery.",
    sourceUrl: "https://en.wikipedia.org/wiki/Holy_Week",
  },
  {
    id: "mx-independence-sep-15-16",
    market: "MX",
    label: "Grito de Dolores and Independence Day",
    dateRule: { type: "range", start: "09-15", end: "09-16" },
    gravity: "celebratory",
    guidance:
      "The Ley sobre el Escudo, la Bandera y el Himno Nacionales restricts altering or commercially exploiting the flag, coat of arms or anthem, and violations draw fines. Avoid sombrero-and-moustache stereotypes, and don't confuse the day with Cinco de Mayo.",
    sourceUrl: "https://en.wikipedia.org/wiki/Cry_of_Dolores",
  },
  {
    id: "mx-earthquakes-sep-19",
    market: "MX",
    label: "September 19 earthquakes anniversary (1985, 2017, 2022)",
    dateRule: { type: "fixed", date: "09-19" },
    gravity: "solemn",
    guidance:
      "Major earthquakes struck on this date in 1985 and 2017 (and in 2022), and a national earthquake drill is often scheduled for it. Avoid \"shake\"/\"temblor\" puns, collapsed-building imagery and alarm-sound effects that mimic the seismic alert.",
    sourceUrl: "https://en.wikipedia.org/wiki/2017_Puebla_earthquake",
  },
  {
    id: "mx-ayotzinapa-sep-26",
    market: "MX",
    label: "Ayotzinapa 43 students disappearance anniversary (2014)",
    dateRule: { type: "fixed", date: "09-26" },
    gravity: "contested",
    guidance:
      "The state's role in the disappearance is still disputed and marches are held every year (\"¡Fue el Estado!\"). Avoid the number 43 in prices or codes, buses of students, \"disappear\" wordplay and police or army imagery.",
    sourceUrl: "https://en.wikipedia.org/wiki/2014_Iguala_mass_kidnapping",
  },
  {
    id: "mx-tlatelolco-oct-2",
    market: "MX",
    label: "Tlatelolco massacre anniversary (1968)",
    dateRule: { type: "fixed", date: "10-02" },
    gravity: "solemn",
    guidance:
      "By law the flag flies at half-mast, and \"2 de octubre no se olvida\" marches fill Mexico City. Avoid soldiers-versus-students imagery, festive 1968 Olympics nostalgia and any promotion riffing on that slogan.",
    sourceUrl: "https://en.wikipedia.org/wiki/Tlatelolco_massacre",
  },
  {
    id: "mx-dia-de-muertos",
    market: "MX",
    label: "Día de Muertos",
    dateRule: { type: "range", start: "11-01", end: "11-02" },
    gravity: "religious-observance",
    guidance:
      "Families build ofrendas for their own dead, so treat altars, cempasúchil and calaveras as memorial practice, not Halloween horror or costume fodder. Commercial appropriation backfires: Disney withdrew its 2013 attempt to trademark \"Día de los Muertos\" after backlash.",
    sourceUrl: "https://en.wikipedia.org/wiki/Day_of_the_Dead",
  },
  {
    id: "mx-virgen-de-guadalupe-dec-12",
    market: "MX",
    label: "Feast of Our Lady of Guadalupe",
    dateRule: { type: "fixed", date: "12-12" },
    gravity: "religious-observance",
    guidance:
      "Millions of pilgrims travel to the Basilica. The image of the Virgin is sacred: no altering, sexualising or comedic use, and no placing it on alcohol or underwear.",
    sourceUrl: "https://en.wikipedia.org/wiki/Our_Lady_of_Guadalupe",
  },

  /* ============================== NG ============================== */
  {
    id: "ng-armed-forces-remembrance-jan-15",
    market: "NG",
    label: "Armed Forces Remembrance Day (end of Civil War, 1970)",
    dateRule: { type: "fixed", date: "01-15" },
    gravity: "solemn",
    guidance:
      "Wreath-laying and a poppy appeal honour fallen soldiers. Avoid military parody and Civil War or Biafra references, which remain raw in the South-East.",
    sourceUrl: "https://en.wikipedia.org/wiki/Armed_Forces_Remembrance_Day",
  },
  {
    id: "ng-easter",
    market: "NG",
    label: "Easter (Good Friday to Easter Monday)",
    dateRule: {
      type: "variable",
      note: "Good Friday to Easter Monday, following Western (Gregorian) Easter; both are federal public holidays. Computed, not estimated.",
      approximate: w(
        ["2025-04-18", "2025-04-21"],
        ["2026-04-03", "2026-04-06"],
        ["2027-03-26", "2027-03-29"],
        ["2028-04-14", "2028-04-17"],
        ["2029-03-30", "2029-04-02"],
        ["2030-04-19", "2030-04-22"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "Nigeria's Christian South observes the day devoutly, so avoid irreverent crucifixion humour and party-heavy Good Friday creative. Keep Easter messaging out of northern Muslim-majority targeting, where it can read as proselytising.",
    sourceUrl: "https://en.wikipedia.org/wiki/Easter",
  },
  {
    id: "ng-ramadan",
    market: "NG",
    label: "Ramadan",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} In Nigeria the Sultan of Sokoto announces the sighting.`,
      approximate: w(...RAMADAN),
    },
    gravity: "religious-observance",
    guidance:
      "In the Muslim-majority North (where Hisbah religious police operate in states such as Kano), avoid daytime eating or drinking, alcohol and immodest styling. National campaigns should split creative between North and South.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ramadan",
  },
  {
    id: "ng-eid-al-fitr",
    market: "NG",
    label: "Eid al-Fitr (Small Sallah)",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} The Federal Government declares the public holidays after the Sultan of Sokoto's announcement.`,
      approximate: w(...EID_AL_FITR),
    },
    gravity: "celebratory",
    guidance:
      "Durbar horse festivals in Kano, Katsina and Zaria are central imagery; keep alcohol out and show prayer and mosque scenes respectfully.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Fitr",
  },
  {
    id: "ng-eid-al-adha",
    market: "NG",
    label: "Eid al-Adha (Big Sallah / Ileya)",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} The Federal Government declares the public holidays after the Sultan of Sokoto's announcement.`,
      approximate: w(...EID_AL_ADHA),
    },
    gravity: "celebratory",
    guidance:
      "The ram is central to the festival: avoid gore and mocking rams, and be aware that rising livestock prices make \"Sallah ram\" affordability jokes a sore point.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Adha",
  },
  {
    id: "ng-biafra-may-30",
    market: "NG",
    label: "Biafra Remembrance Day (1967 declaration)",
    dateRule: { type: "fixed", date: "05-30" },
    gravity: "contested",
    guidance:
      "Separatist groups call sit-at-home orders across the South-East, and businesses there often shut. Avoid the Biafran rising-sun flag, secession jokes and army imagery, and don't schedule South-East activations for the day.",
    sourceUrl: "https://en.wikipedia.org/wiki/Biafra",
  },
  {
    id: "ng-democracy-day-jun-12",
    market: "NG",
    label: "Democracy Day (annulled June 12, 1993 election)",
    dateRule: { type: "fixed", date: "06-12" },
    gravity: "contested",
    guidance:
      "Honours M.K.O. Abiola's annulled 1993 election win, and the day is used for anti-government protests (#June12Protest). Avoid party colours, protest imagery used as brand aesthetics and \"Hope '93\" parody.",
    sourceUrl: "https://en.wikipedia.org/wiki/Democracy_Day_(Nigeria)",
  },
  {
    id: "ng-independence-oct-1",
    market: "NG",
    label: "Independence Day (1960)",
    dateRule: { type: "fixed", date: "10-01" },
    gravity: "celebratory",
    guidance:
      "Green-white-green creative is standard, but disrespectful use of national symbols draws complaints. Economic-hardship sentiment runs high, so avoid tone-deaf luxury \"Happy Independence\" flexing.",
    sourceUrl: "https://en.wikipedia.org/wiki/Independence_Day_(Nigeria)",
  },
  {
    id: "ng-lekki-toll-gate-oct-20",
    market: "NG",
    label: "Lekki toll gate shooting anniversary (#EndSARS, 2020)",
    dateRule: { type: "fixed", date: "10-20" },
    gravity: "contested",
    guidance:
      "Soldiers fired on #EndSARS protesters; a Lagos judicial panel called it a massacre, while the army and federal government disputed that. Avoid a blood-stained Nigerian flag, toll-gate or soldier imagery, and co-opting #EndSARS hashtags.",
    sourceUrl: "https://en.wikipedia.org/wiki/Lekki_massacre",
  },

  /* ============================== FR ============================== */
  {
    id: "fr-charlie-hebdo-jan-7",
    market: "FR",
    label: "Charlie Hebdo attack anniversary (2015)",
    dateRule: { type: "fixed", date: "01-07" },
    gravity: "solemn",
    guidance:
      "Twelve people were killed at the magazine, followed by the Hypercacher kosher-supermarket siege on Jan 9. Avoid \"Je suis ___\" slogan parodies, depictions of the Prophet, and pencil-versus-gun imagery used for marketing.",
    sourceUrl: "https://en.wikipedia.org/wiki/Charlie_Hebdo_shooting",
  },
  {
    id: "fr-victoire-may-8",
    market: "FR",
    label: "Victoire 1945 (VE Day)",
    dateRule: { type: "fixed", date: "05-08" },
    gravity: "solemn",
    guidance:
      "Ceremonies are held at every monument aux morts. Avoid WWII military nostalgia, \"victory\" sale puns and German-versus-French war jokes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Victory_in_Europe_Day",
  },
  {
    id: "fr-fete-nationale-jul-14",
    market: "FR",
    label: "Fête nationale (Bastille Day)",
    dateRule: { type: "fixed", date: "07-14" },
    gravity: "celebratory",
    guidance:
      "Tricolour, military parade and fireworks creative is standard. Keep Nice and Alpes-Maritimes creative clear of crowds-and-fireworks scenes (see the 2016 Nice attack entry), and avoid guillotine jokes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Bastille_Day",
  },
  {
    id: "fr-nice-attack-jul-14",
    market: "FR",
    label: "Nice truck attack anniversary (2016)",
    dateRule: { type: "fixed", date: "07-14" },
    gravity: "solemn",
    guidance:
      "86 people were killed when a truck drove into Bastille Day fireworks crowds on the Promenade des Anglais. Avoid trucks or vehicles moving through crowds and seafront-fireworks crowd shots, especially in Nice.",
    sourceUrl: "https://en.wikipedia.org/wiki/2016_Nice_truck_attack",
  },
  {
    id: "fr-vel-dhiv",
    market: "FR",
    label: "Vel' d'Hiv Roundup commemoration (national day for victims of Vichy racist and antisemitic crimes)",
    dateRule: {
      type: "variable",
      note: "Commemorated on July 16 (anniversary of the 1942 roundup) if that is a Sunday, otherwise on the following Sunday (decree 93-150, law 2000-644). Windows run from July 16 to that Sunday. Computed, not estimated.",
      approximate: w(
        ["2025-07-16", "2025-07-20"],
        ["2026-07-16", "2026-07-19"],
        ["2027-07-16", "2027-07-18"],
        ["2028-07-16", "2028-07-16"],
        ["2029-07-16", "2029-07-22"],
        ["2030-07-16", "2030-07-21"],
      ),
    },
    gravity: "solemn",
    guidance:
      "French police rounded up more than 13,000 Jews, including 4,000 children, into the Vélodrome d'Hiver. Avoid \"rafle\"/\"rafler\" wordplay (commonly used for scooping up prizes or deals), yellow-star-like badges, and cattle-car or velodrome imagery.",
    sourceUrl:
      "https://www.defense.gouv.fr/chemins-memoire/histoire-memoires/journees-nationales-commemoratives/journee-nationale-memoire-victimes-crimes",
  },
  {
    id: "fr-toussaint-nov-1",
    market: "FR",
    label: "Toussaint (All Saints' Day)",
    dateRule: { type: "fixed", date: "11-01" },
    gravity: "religious-observance",
    guidance:
      "Families visit cemeteries with chrysanthemums, which in France are funeral flowers, so never use them as a gift or decoration motif. Halloween tie-ins on Oct 31–Nov 1 should stay light and away from graves.",
    sourceUrl: "https://en.wikipedia.org/wiki/All_Saints%27_Day",
  },
  {
    id: "fr-armistice-nov-11",
    market: "FR",
    label: "Armistice Day (1918)",
    dateRule: { type: "fixed", date: "11-11" },
    gravity: "solemn",
    guidance:
      "The Bleuet de France is the remembrance flower. Avoid trench-warfare jokes, \"armistice\" or \"ceasefire\" sale puns and poilu caricatures.",
    sourceUrl: "https://en.wikipedia.org/wiki/Armistice_Day",
  },
  {
    id: "fr-paris-attacks-nov-13",
    market: "FR",
    label: "November 13 Paris attacks anniversary (2015)",
    dateRule: { type: "fixed", date: "11-13" },
    gravity: "solemn",
    guidance:
      "130 people were killed at the Bataclan, the Stade de France and café terraces. Avoid concert-venue or terrace-shooting imagery and \"fusillade\"/\"shoot\" copy; Nov 13, 2026 is a Friday, as in 2015, so skip Friday-the-13th horror or luck promotions that year.",
    sourceUrl: "https://en.wikipedia.org/wiki/November_2015_Paris_attacks",
  },

  /* ============================== DE ============================== */
  {
    id: "de-holocaust-remembrance-jan-27",
    market: "DE",
    label: "Day of Remembrance for the Victims of National Socialism (Auschwitz liberation, 1945)",
    dateRule: { type: "fixed", date: "01-27" },
    gravity: "solemn",
    guidance:
      "Bundestag memorial session and flags at half-mast. Avoid striped camp-uniform-like garments or star badges (Zara pulled a striped shirt with a yellow star in 2014), trains and ramps, and Nazi-era phrases such as \"Jedem das Seine\" or \"Arbeit macht frei\" in any wordplay.",
    sourceUrl: "https://en.wikipedia.org/wiki/International_Holocaust_Remembrance_Day",
  },
  {
    id: "de-karfreitag",
    market: "DE",
    label: "Karfreitag (Good Friday) silent holiday",
    dateRule: {
      type: "variable",
      note: "Good Friday, two days before Western Easter; windows run from Maundy Thursday to Holy Saturday because several states' dance bans (Tanzverbot) begin on Thursday night. Computed, not estimated; rules differ by state.",
      approximate: w(
        ["2025-04-17", "2025-04-19"],
        ["2026-04-02", "2026-04-04"],
        ["2027-03-25", "2027-03-27"],
        ["2028-04-13", "2028-04-15"],
        ["2029-03-29", "2029-03-31"],
        ["2030-04-18", "2030-04-20"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "A \"stiller Tag\" (silent day): public dance, party and loud entertainment events are banned in most states. Don't schedule club or party launches or loud live activations, and avoid irreverent crucifixion humour.",
    sourceUrl: "https://de.wikipedia.org/wiki/Stiller_Feiertag",
  },
  {
    id: "de-liberation-may-8",
    market: "DE",
    label: "End of WWII in Europe / Day of Liberation (1945)",
    dateRule: { type: "fixed", date: "05-08" },
    gravity: "solemn",
    guidance:
      "Remembered as liberation from Nazism, not as a defeat or a victory to celebrate. Avoid Wehrmacht or WWII military nostalgia, \"capitulation\" sale puns and ruins-of-Berlin imagery used playfully.",
    sourceUrl: "https://en.wikipedia.org/wiki/Victory_in_Europe_Day",
  },
  {
    id: "de-uprising-jun-17",
    market: "DE",
    label: "East German uprising anniversary (1953)",
    dateRule: { type: "fixed", date: "06-17" },
    gravity: "solemn",
    guidance:
      "Soviet tanks crushed a workers' uprising across the GDR. Avoid tanks and \"Ostalgie\" GDR-kitsch promotions on the date.",
    sourceUrl: "https://en.wikipedia.org/wiki/East_German_uprising_of_1953",
  },
  {
    id: "de-berlin-wall-aug-13",
    market: "DE",
    label: "Berlin Wall construction anniversary (1961)",
    dateRule: { type: "fixed", date: "08-13" },
    gravity: "solemn",
    guidance:
      "Commemorates the division and the people killed trying to cross. Avoid \"tear down the wall\" or border-crossing sale puns, death-strip or escape imagery, and GDR kitsch.",
    sourceUrl: "https://en.wikipedia.org/wiki/Berlin_Wall",
  },
  {
    id: "de-unity-day-oct-3",
    market: "DE",
    label: "German Unity Day",
    dateRule: { type: "fixed", date: "10-03" },
    gravity: "celebratory",
    guidance:
      "Black-red-gold unity creative is fine; never use the imperial black-white-red colours, which are associated with the far right. Avoid Ossi/Wessi stereotypes.",
    sourceUrl: "https://en.wikipedia.org/wiki/German_Unity_Day",
  },
  {
    id: "de-november-9",
    market: "DE",
    label: "November 9: Kristallnacht pogrom (1938) and fall of the Berlin Wall (1989)",
    dateRule: { type: "fixed", date: "11-09" },
    gravity: "solemn",
    guidance:
      "The pogrom memory is why Unity Day is not held on Nov 9, so Wall-fall celebrations must not erase it. Avoid broken-glass or burning imagery, \"Kristall\" wordplay and automated \"observance\" promotions: KFC Germany apologised in 2022 after an app push urged users to treat themselves with cheese chicken on Reichspogromnacht.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kristallnacht",
  },
  {
    id: "de-volkstrauertag",
    market: "DE",
    label: "Volkstrauertag (National Day of Mourning)",
    dateRule: {
      type: "variable",
      note: "Sunday two weeks before the First Sunday of Advent (Nov 13–19). Computed, not estimated.",
      approximate: w(
        ["2025-11-16", "2025-11-16"],
        ["2026-11-15", "2026-11-15"],
        ["2027-11-14", "2027-11-14"],
        ["2028-11-19", "2028-11-19"],
        ["2029-11-18", "2029-11-18"],
        ["2030-11-17", "2030-11-17"],
      ),
    },
    gravity: "solemn",
    guidance:
      "A silent day for victims of war and tyranny: many states restrict public dance and entertainment events. Avoid party launches, military nostalgia and early Christmas-market or Black Friday hype on the day.",
    sourceUrl: "https://en.wikipedia.org/wiki/Volkstrauertag",
  },
  {
    id: "de-totensonntag",
    market: "DE",
    label: "Totensonntag (Protestant Sunday of the Dead)",
    dateRule: {
      type: "variable",
      note: "Last Sunday before the First Sunday of Advent (Nov 20–26). Computed, not estimated.",
      approximate: w(
        ["2025-11-23", "2025-11-23"],
        ["2026-11-22", "2026-11-22"],
        ["2027-11-21", "2027-11-21"],
        ["2028-11-26", "2028-11-26"],
        ["2029-11-25", "2029-11-25"],
        ["2030-11-24", "2030-11-24"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "A silent day under state holiday laws, and many Christmas markets traditionally open only after it. Avoid dance or party events and Christmas kick-off promotions dated for that Sunday.",
    sourceUrl: "https://de.wikipedia.org/wiki/Totensonntag",
  },
  {
    id: "de-breitscheidplatz-dec-19",
    market: "DE",
    label: "Breitscheidplatz Christmas market attack anniversary (2016)",
    dateRule: { type: "fixed", date: "12-19" },
    gravity: "solemn",
    guidance:
      "A truck was driven into a Berlin Christmas market, killing 13 people; a car-ramming at Magdeburg's market followed on Dec 20, 2024. Avoid vehicles moving through Christmas-market crowds and \"crash\" or \"ram\" price copy around these dates.",
    sourceUrl: "https://en.wikipedia.org/wiki/2016_Berlin_truck_attack",
  },

  /* ============================== BR ============================== */
  {
    id: "br-brumadinho-jan-25",
    market: "BR",
    label: "Brumadinho dam disaster anniversary (2019)",
    dateRule: { type: "fixed", date: "01-25" },
    gravity: "solemn",
    guidance:
      "Vale's tailings dam collapsed and 272 people died in the mudflow, most in Minas Gerais. Avoid mud or sludge (lama) imagery, \"tsunami of offers\" copy, and mining or sustainability claims timed to the date.",
    sourceUrl: "https://en.wikipedia.org/wiki/Brumadinho_dam_disaster",
  },
  {
    id: "br-kiss-nightclub-jan-27",
    market: "BR",
    label: "Kiss nightclub fire anniversary (Santa Maria, 2013)",
    dateRule: { type: "fixed", date: "01-27" },
    gravity: "solemn",
    guidance:
      "242 people, mostly students, died after on-stage pyrotechnics ignited the ceiling. Avoid indoor pyrotechnics, flames and \"hot\"/\"on fire\" party copy, and packed-nightclub scenes, especially in Rio Grande do Sul.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kiss_nightclub_fire",
  },
  {
    id: "br-carnival",
    market: "BR",
    label: "Carnival (Saturday to Ash Wednesday)",
    dateRule: {
      type: "variable",
      note: "Carnival Tuesday is 47 days before Western Easter; windows run from Carnival Saturday to Ash Wednesday. Computed, not estimated; municipal parade schedules vary.",
      approximate: w(
        ["2025-03-01", "2025-03-05"],
        ["2026-02-14", "2026-02-18"],
        ["2027-02-06", "2027-02-10"],
        ["2028-02-26", "2028-03-01"],
        ["2029-02-10", "2029-02-14"],
        ["2030-03-02", "2030-03-06"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Avoid blackface or \"nega maluca\" costumes, Indigenous headdresses as costume, and creative that sexualises women without consent cues (Brazil's \"Não é Não\" anti-harassment campaigns are prominent). Don't glamorise drink-driving.",
    sourceUrl: "https://en.wikipedia.org/wiki/Brazilian_Carnival",
  },
  {
    id: "br-tiradentes-apr-21",
    market: "BR",
    label: "Tiradentes Day",
    dateRule: { type: "fixed", date: "04-21" },
    gravity: "celebratory",
    guidance:
      "Honours the Inconfidência Mineira martyr who was hanged and quartered in 1792, so avoid gallows or hanging gags; the day is also Brasília's anniversary.",
    sourceUrl: "https://en.wikipedia.org/wiki/Tiradentes",
  },
  {
    id: "br-independence-sep-7",
    market: "BR",
    label: "Independence Day",
    dateRule: { type: "fixed", date: "09-07" },
    gravity: "celebratory",
    guidance:
      "The green-and-yellow shirt and flag have been politically polarised since the 2021–2022 Sept 7 rallies, so heavy flag or national-team styling can read as partisan. Lei 5.700/1971 governs how national symbols may be used.",
    sourceUrl: "https://en.wikipedia.org/wiki/Independence_Day_(Brazil)",
  },
  {
    id: "br-aparecida-oct-12",
    market: "BR",
    label: "Nossa Senhora Aparecida (Patroness of Brazil) / Children's Day",
    dateRule: { type: "fixed", date: "10-12" },
    gravity: "religious-observance",
    guidance:
      "A Catholic holy day with pilgrimages to Aparecida that shares the date with Children's Day toy retail. Never use the saint's image irreverently; a 1995 TV incident in which an evangelical pastor kicked a statue of her caused national uproar.",
    sourceUrl: "https://en.wikipedia.org/wiki/Our_Lady_of_Aparecida",
  },
  {
    id: "br-black-consciousness-nov-20",
    market: "BR",
    label: "Day of Zumbi and Black Consciousness",
    dateRule: { type: "fixed", date: "11-20" },
    gravity: "solemn",
    guidance:
      "A national holiday since 2024, marking the death of Zumbi dos Palmares; the killing of João Alberto Freitas by Carrefour security guards on the eve of the 2020 holiday led to nationwide protests. Avoid \"Black Friday\" wordplay or sale launches on the day, slavery imagery and tokenistic casting.",
    sourceUrl: "https://en.wikipedia.org/wiki/Black_consciousness_day",
  },

  /* ============================== ID ============================== */
  {
    id: "id-nyepi",
    market: "ID",
    label: "Nyepi (Balinese Day of Silence, Saka New Year)",
    dateRule: {
      type: "variable",
      note: "Day after Tilem Kesanga (the dark moon of the ninth Balinese month) in the Saka calendar; windows run from the Ogoh-ogoh eve to the following day. Sources disagree on 2027 (8 or 9 March). Confirm with the government's joint ministerial decree (SKB) holiday list.",
      approximate: w(
        ["2025-03-28", "2025-03-30"],
        ["2026-03-18", "2026-03-20"],
        ["2027-03-07", "2027-03-10"],
        ["2028-03-25", "2028-03-27"],
        ["2029-03-14", "2029-03-16"],
        ["2030-03-04", "2030-03-06"],
      ),
    },
    gravity: "religious-observance",
    guidance:
      "Bali shuts down for 24 hours: no lights, travel or noise, the airport closes and mobile data is typically switched off. Don't schedule launches, deliveries, live streams or events in Bali, and treat ogoh-ogoh demons as ritual, not Halloween props.",
    sourceUrl: "https://en.wikipedia.org/wiki/Nyepi",
  },
  {
    id: "id-ramadan",
    market: "ID",
    label: "Ramadan (Bulan Puasa)",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} The Ministry of Religious Affairs' sidang isbat sets the official start; Muhammadiyah often begins a day earlier.`,
      approximate: w(...RAMADAN),
    },
    gravity: "religious-observance",
    guidance:
      "The broadcasting commission (KPI) issues Ramadan content circulars restricting revealing clothing and suggestive content. Avoid daytime eating shots, and alcohol entirely; Aceh enforces sharia rules on public conduct.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ramadan",
  },
  {
    id: "id-lebaran",
    market: "ID",
    label: "Idul Fitri (Lebaran) and collective leave",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} Indonesia's sidang isbat often falls a day after Saudi Arabia (e.g. 21 March 2026). Windows span the typical cuti bersama (collective leave) period; the government's SKB lists the exact days each year.`,
      approximate: w(
        ["2025-03-29", "2025-04-07"],
        ["2026-03-20", "2026-03-24"],
        ["2027-03-08", "2027-03-15"],
        ["2028-02-25", "2028-03-03"],
        ["2029-02-13", "2029-02-20"],
        ["2030-02-03", "2030-02-10"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Mudik (homecoming travel) empties cities and disrupts logistics, and ads peak before the holiday alongside THR bonus spending. Keep alcohol out, use ketupat and family-reunion imagery, and avoid mocking travel or crowds, given mudik road deaths.",
    sourceUrl: "https://en.wikipedia.org/wiki/Mudik",
  },
  {
    id: "id-independence-aug-17",
    market: "ID",
    label: "Independence Day (Hari Kemerdekaan)",
    dateRule: { type: "fixed", date: "08-17" },
    gravity: "celebratory",
    guidance:
      "Law 24/2009, Art. 24, bans using the Merah Putih flag in commercial ads or as packaging, on pain of prison or fines, so use red-white colour schemes rather than the flag itself. Village games (panjat pinang, sack races) are safe imagery.",
    sourceUrl: "https://en.wikipedia.org/wiki/Independence_Day_(Indonesia)",
  },
  {
    id: "id-g30s-sep-30",
    market: "ID",
    label: "30 September Movement (G30S, 1965) anniversary",
    dateRule: { type: "fixed", date: "09-30" },
    gravity: "contested",
    guidance:
      "The official narrative of the 1965 coup attempt and the mass killings that followed remains politically disputed, and flags fly at half-mast. Communist symbols are banned (MPRS Decree XXV/1966), so avoid hammer-and-sickle or red-star motifs and \"PKI\" jokes.",
    sourceUrl: "https://en.wikipedia.org/wiki/30_September_Movement",
  },
  {
    id: "id-pancasila-sanctity-oct-1",
    market: "ID",
    label: "Pancasila Sanctity Day (Hari Kesaktian Pancasila)",
    dateRule: { type: "fixed", date: "10-01" },
    gravity: "contested",
    guidance:
      "State commemoration of the generals killed in 1965, framed by the contested official narrative. Do not alter or commercialise the Garuda Pancasila emblem (Law 24/2009), and avoid communist-symbol jokes.",
    sourceUrl: "https://en.wikipedia.org/wiki/30_September_Movement",
  },
  {
    id: "id-kanjuruhan-oct-1",
    market: "ID",
    label: "Kanjuruhan Stadium disaster anniversary (Malang, 2022)",
    dateRule: { type: "fixed", date: "10-01" },
    gravity: "solemn",
    guidance:
      "135 football fans died after police fired tear gas into the stands. Avoid tear-gas or smoke imagery, packed-stadium \"crush\" copy and Arema or Malang football promotions on the day.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kanjuruhan_Stadium_disaster",
  },
  {
    id: "id-bali-bombings-oct-12",
    market: "ID",
    label: "Bali bombings anniversary (Kuta, 2002)",
    dateRule: { type: "fixed", date: "10-12" },
    gravity: "solemn",
    guidance:
      "202 people, including 88 Australians, were killed at Paddy's Pub and the Sari Club. Avoid nightclub \"blast\"/\"explosive party\" promotions in Bali and campaigns reaching Australian tourists around the date.",
    sourceUrl: "https://en.wikipedia.org/wiki/2002_Bali_bombings",
  },
  {
    id: "id-aceh-tsunami-dec-26",
    market: "ID",
    label: "Indian Ocean tsunami anniversary (Aceh, 2004)",
    dateRule: { type: "fixed", date: "12-26" },
    gravity: "solemn",
    guidance:
      "About 170,000 people died in Indonesia, mostly in Aceh. Avoid wave or \"tsunami\" sale copy and beach-disaster imagery, and remember that Aceh applies sharia rules to advertising content.",
    sourceUrl: "https://en.wikipedia.org/wiki/2004_Indian_Ocean_earthquake_and_tsunami",
  },

  /* ============================== TR ============================== */
  {
    id: "tr-earthquakes-feb-6",
    market: "TR",
    label: "February 6 Kahramanmaraş earthquakes anniversary (2023)",
    dateRule: { type: "fixed", date: "02-06" },
    gravity: "solemn",
    guidance:
      "More than 50,000 people died in Türkiye, and remembrance centres on 04:17. Avoid \"shaking\"/\"sarsıcı\" puns, rubble imagery and opportunistic \"earthquake-proof\" real-estate or insurance claims timed to the date.",
    sourceUrl: "https://en.wikipedia.org/wiki/2023_Turkey%E2%80%93Syria_earthquakes",
  },
  {
    id: "tr-canakkale-mar-18",
    market: "TR",
    label: "Çanakkale Victory and Martyrs' Remembrance Day",
    dateRule: { type: "fixed", date: "03-18" },
    gravity: "solemn",
    guidance:
      "Commemorates the 1915 Gallipoli naval victory and the war dead (şehitler). Avoid trench-warfare humour and casual use of \"şehit\", and remember that ANZAC audiences commemorate the same campaign on Apr 25.",
    sourceUrl: "https://en.wikipedia.org/wiki/Gallipoli_campaign",
  },
  {
    id: "tr-sovereignty-children-apr-23",
    market: "TR",
    label: "National Sovereignty and Children's Day",
    dateRule: { type: "fixed", date: "04-23" },
    gravity: "celebratory",
    guidance:
      "Child-centred creative is expected. Atatürk's image and memory are protected by Law 5816, so no caricature, alteration or comic use.",
    sourceUrl: "https://en.wikipedia.org/wiki/National_Sovereignty_and_Children%27s_Day",
  },
  {
    id: "tr-april-24",
    market: "TR",
    label: "April 24 (Armenian Genocide Remembrance Day, officially disputed)",
    dateRule: { type: "fixed", date: "04-24" },
    gravity: "contested",
    guidance:
      "Türkiye officially rejects the \"genocide\" characterisation, and the term has drawn prosecutions under Article 301. Avoid any 1915 references, Armenian-Turkish identity storylines and brand statements either way in Türkiye-targeted campaigns.",
    sourceUrl: "https://en.wikipedia.org/wiki/Armenian_Genocide_Remembrance_Day",
  },
  {
    id: "tr-youth-sports-may-19",
    market: "TR",
    label: "Commemoration of Atatürk, Youth and Sports Day",
    dateRule: { type: "fixed", date: "05-19" },
    gravity: "celebratory",
    guidance:
      "Marks Atatürk's 1919 landing at Samsun. Sports and youth creative is fine, but Atatürk imagery must be reverent (Law 5816), and whether a brand does or doesn't feature him is itself scrutinised.",
    sourceUrl: "https://en.wikipedia.org/wiki/Commemoration_of_Atat%C3%BCrk,_Youth_and_Sports_Day",
  },
  {
    id: "tr-july-15",
    market: "TR",
    label: "Democracy and National Unity Day (2016 coup attempt)",
    dateRule: { type: "fixed", date: "07-15" },
    gravity: "solemn",
    guidance:
      "Official commemoration of the 251 people killed resisting the coup attempt; the framing and the purges that followed are politically polarising. Avoid tanks or soldiers on bridges, and \"darbe\" (coup, also \"blow\") wordplay such as \"fiyat darbesi\".",
    sourceUrl: "https://en.wikipedia.org/wiki/2016_Turkish_coup_attempt",
  },
  {
    id: "tr-victory-day-aug-30",
    market: "TR",
    label: "Victory Day (Zafer Bayramı, 1922)",
    dateRule: { type: "fixed", date: "08-30" },
    gravity: "celebratory",
    guidance:
      "Patriotic military-victory creative is expected, but never comic or casual. Keep flag and Atatürk use reverent.",
    sourceUrl: "https://en.wikipedia.org/wiki/Victory_Day_(Turkey)",
  },
  {
    id: "tr-republic-day-oct-29",
    market: "TR",
    label: "Republic Day (Cumhuriyet Bayramı)",
    dateRule: { type: "fixed", date: "10-29" },
    gravity: "celebratory",
    guidance:
      "Omitting or sidelining Atatürk is itself a flashpoint: Disney+ faced boycott calls in 2023 for dropping an Atatürk series around the centenary. Keep flag and Atatürk imagery reverent and unaltered.",
    sourceUrl: "https://en.wikipedia.org/wiki/Republic_Day_(Turkey)",
  },
  {
    id: "tr-ataturk-nov-10",
    market: "TR",
    label: "Atatürk Remembrance Day (death, 1938)",
    dateRule: { type: "fixed", date: "11-10" },
    gravity: "solemn",
    guidance:
      "At 09:05 sirens sound and the country, traffic included, stops for a minute's silence; flags fly at half-mast. Pause promotional posting, music-led and festive content, especially around 09:05.",
    sourceUrl: "https://en.wikipedia.org/wiki/Mustafa_Kemal_Atat%C3%BCrk",
  },
  {
    id: "tr-ramadan",
    market: "TR",
    label: "Ramazan (Ramadan)",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} Türkiye's Diyanet publishes a calculated calendar in advance rather than relying on local sighting.`,
      approximate: w(...RAMADAN),
    },
    gravity: "religious-observance",
    guidance:
      "Iftar and sahur ad slots peak. Alcohol advertising is already banned under Law 6487, so avoid alcohol cues entirely, and don't show daytime eating in religious-conservative targeting.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ramadan",
  },
  {
    id: "tr-ramazan-bayrami",
    market: "TR",
    label: "Ramazan Bayramı (Eid al-Fitr), with arife",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} Windows run from arife (the eve, a half-day holiday) to the third day of Bayram per the Diyanet calendar; the government often extends the holiday by decree.`,
      approximate: w(
        ["2025-03-29", "2025-04-01"],
        ["2026-03-19", "2026-03-22"],
        ["2027-03-08", "2027-03-12"],
        ["2028-02-25", "2028-02-29"],
        ["2029-02-13", "2029-02-17"],
        ["2030-02-03", "2030-02-07"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "\"Ramazan Bayramı\" is the neutral official name; the secular \"Şeker Bayramı\" (Sugar Feast) draws objections from religious conservatives. Keep alcohol out of the creative.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Fitr",
  },
  {
    id: "tr-kurban-bayrami",
    market: "TR",
    label: "Kurban Bayramı (Eid al-Adha), with arife",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} Windows run from arife to the fourth day of Bayram per the Diyanet calendar; the government often extends the holiday by decree.`,
      approximate: w(
        ["2025-06-05", "2025-06-09"],
        ["2026-05-26", "2026-05-30"],
        ["2027-05-15", "2027-05-20"],
        ["2028-05-04", "2028-05-09"],
        ["2029-04-23", "2029-04-28"],
        ["2030-04-12", "2030-04-17"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "Avoid slaughter, blood or knife imagery and cute-lamb jokes about sacrifice. Sacrifice-donation (vekalet) promotions should run only with registered charities.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Adha",
  },

  /* ============================== ZA ============================== */
  {
    id: "za-human-rights-day-mar-21",
    market: "ZA",
    label: "Human Rights Day (Sharpeville massacre, 1960)",
    dateRule: { type: "fixed", date: "03-21" },
    gravity: "solemn",
    guidance:
      "Police killed 69 anti-pass-law protesters. Avoid \"Human Rights Day sale\" framing, police-shooting or pass-book imagery, and \"shoot\"/\"dompas\" jokes.",
    sourceUrl: "https://en.wikipedia.org/wiki/Sharpeville_massacre",
  },
  {
    id: "za-freedom-day-apr-27",
    market: "ZA",
    label: "Freedom Day (first democratic election, 1994)",
    dateRule: { type: "fixed", date: "04-27" },
    gravity: "celebratory",
    guidance:
      "Voting-queue and unity imagery is welcome. Never show the apartheid-era orange-white-blue flag: courts have ruled its gratuitous display hate speech.",
    sourceUrl: "https://en.wikipedia.org/wiki/Freedom_Day_(South_Africa)",
  },
  {
    id: "za-youth-day-jun-16",
    market: "ZA",
    label: "Youth Day (Soweto uprising, 1976)",
    dateRule: { type: "fixed", date: "06-16" },
    gravity: "solemn",
    guidance:
      "Police fired on students protesting Afrikaans-medium schooling. Never recreate or parody the Hector Pieterson photograph, and avoid \"Youth Day sale\" party framing and school-uniform protest imagery used as fashion.",
    sourceUrl: "https://en.wikipedia.org/wiki/Soweto_uprising",
  },
  {
    id: "za-womens-day-aug-9",
    market: "ZA",
    label: "National Women's Day (1956 women's march)",
    dateRule: { type: "fixed", date: "08-09" },
    gravity: "celebratory",
    guidance:
      "Commemorates 20,000 women marching on the Union Buildings against pass laws (\"wathint' abafazi, wathint' imbokodo\"). Avoid kitchen or cleaning discounts \"for her\", pampering clichés and anything that trivialises gender-based violence.",
    sourceUrl: "https://en.wikipedia.org/wiki/National_Women%27s_Day",
  },
  {
    id: "za-marikana-aug-16",
    market: "ZA",
    label: "Marikana massacre anniversary (2012)",
    dateRule: { type: "fixed", date: "08-16" },
    gravity: "contested",
    guidance:
      "Police killed 34 striking Lonmin miners; accountability and Cyril Ramaphosa's role as a Lonmin director remain politically disputed. Avoid mining \"strike\" wordplay, police-shooting imagery and the green-blanket figure of Mgcineni \"Mambush\" Noki.",
    sourceUrl: "https://en.wikipedia.org/wiki/Marikana_massacre",
  },
  {
    id: "za-heritage-day-sep-24",
    market: "ZA",
    label: "Heritage Day",
    dateRule: { type: "fixed", date: "09-24" },
    gravity: "celebratory",
    guidance:
      "\"National Braai Day\" branding is common but criticised for flattening heritage into barbecue promotions. Avoid costume-style or blackface depictions of cultures, and cast and dress real communities accurately.",
    sourceUrl: "https://en.wikipedia.org/wiki/Heritage_Day_(South_Africa)",
  },
  {
    id: "za-16-days-of-activism",
    market: "ZA",
    label: "16 Days of Activism for No Violence against Women and Children",
    dateRule: { type: "range", start: "11-25", end: "12-10" },
    gravity: "solemn",
    guidance:
      "A national campaign against the country's very high rates of gender-based violence. Avoid domestic-violence jokes, \"beat\"/\"punch\" price copy and relationship humour built on control or aggression.",
    sourceUrl: "https://en.wikipedia.org/wiki/16_Days_of_Activism_against_Gender-based_Violence",
  },
  {
    id: "za-reconciliation-dec-16",
    market: "ZA",
    label: "Day of Reconciliation (formerly Day of the Vow)",
    dateRule: { type: "fixed", date: "12-16" },
    gravity: "contested",
    guidance:
      "The date was the Afrikaner nationalist Day of the Vow (Blood River, 1838) and is also the ANC armed wing's 1961 founding day. Avoid Voortrekker, ox-wagon laager or Blood River imagery and apartheid-era flags, and frame the day around reconciliation.",
    sourceUrl: "https://en.wikipedia.org/wiki/Day_of_Reconciliation",
  },

  /* ============================== EG ============================== */
  {
    id: "eg-coptic-christmas-jan-7",
    market: "EG",
    label: "Coptic Orthodox Christmas",
    dateRule: { type: "fixed", date: "01-07" },
    gravity: "religious-observance",
    guidance:
      "Copts break a 43-day largely vegan Nativity fast after midnight mass on Jan 6, and churches have been attacked around the holiday (Alexandria, 2011). Don't default to Dec 25 Western Christmas creative, and avoid meat promotions aimed at Copts before the fast ends.",
    sourceUrl: "https://en.wikipedia.org/wiki/Nativity_Fast",
  },
  {
    id: "eg-january-25",
    market: "EG",
    label: "January 25 (2011 revolution / Police Day)",
    dateRule: { type: "fixed", date: "01-25" },
    gravity: "contested",
    guidance:
      "Officially Police Day (Ismailia, 1952) and the anniversary of the 2011 uprising, with competing and policed meanings. Avoid Tahrir protest imagery, \"revolution\" sale puns, \"Irhal\" (leave) slogans and police-glorifying or police-mocking creative.",
    sourceUrl: "https://en.wikipedia.org/wiki/2011_Egyptian_revolution",
  },
  {
    id: "eg-port-said-feb-1",
    market: "EG",
    label: "Port Said Stadium disaster anniversary (2012)",
    dateRule: { type: "fixed", date: "02-01" },
    gravity: "solemn",
    guidance:
      "74 Al Ahly fans were killed after a match in Port Said, and Ultras commemorations are politically sensitive. Avoid stadium-violence imagery, derby-rivalry banter and football promotions using \"74\" on the date.",
    sourceUrl: "https://en.wikipedia.org/wiki/Port_Said_Stadium_riot",
  },
  {
    id: "eg-sham-el-nessim",
    market: "EG",
    label: "Sham el-Nessim (spring festival, day after Coptic Easter)",
    dateRule: {
      type: "variable",
      note: "Monday after Coptic Orthodox Easter (Julian computus); windows run from Coptic Easter Sunday to Sham el-Nessim. Computed, not estimated.",
      approximate: w(
        ["2025-04-20", "2025-04-21"],
        ["2026-04-12", "2026-04-13"],
        ["2027-05-02", "2027-05-03"],
        ["2028-04-16", "2028-04-17"],
        ["2029-04-08", "2029-04-09"],
        ["2030-04-28", "2030-04-29"],
      ),
    },
    gravity: "celebratory",
    guidance:
      "A national picnic day for Muslims and Christians alike, with coloured eggs and salted fish (fesikh). The Health Ministry warns of fesikh botulism each year, so don't glamorise home-cured fish, and keep the festival free of religious framing.",
    sourceUrl: "https://en.wikipedia.org/wiki/Sham_el-Nessim",
  },
  {
    id: "eg-ramadan",
    market: "EG",
    label: "Ramadan",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} In Egypt, Dar al-Ifta announces the sighting.`,
      approximate: w(...RAMADAN),
    },
    gravity: "religious-observance",
    guidance:
      "The biggest TV and ad season of the year. No alcohol cues or daytime eating shots, and charity appeals that parade sick children or poverty have drawn public backlash, so keep donation creative dignified.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ramadan",
  },
  {
    id: "eg-eid-al-fitr",
    market: "EG",
    label: "Eid al-Fitr",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} In Egypt, Dar al-Ifta announces the sighting.`,
      approximate: w(...EID_AL_FITR),
    },
    gravity: "celebratory",
    guidance:
      "Kahk-and-family creative is standard. Keep alcohol out and show Eid prayer crowds respectfully.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Fitr",
  },
  {
    id: "eg-eid-al-adha",
    market: "EG",
    label: "Eid al-Adha",
    dateRule: {
      type: "variable",
      note: `${ISLAMIC_NOTE} In Egypt, Dar al-Ifta announces the sighting.`,
      approximate: w(...EID_AL_ADHA),
    },
    gravity: "celebratory",
    guidance:
      "Avoid slaughter gore and street-sacrifice imagery. Meat prices are an inflation flashpoint, so avoid flaunting lavish meat spreads or jokes about affording the sacrifice.",
    sourceUrl: "https://en.wikipedia.org/wiki/Eid_al-Adha",
  },
  {
    id: "eg-june-30",
    market: "EG",
    label: "June 30 (2013 protests and removal of President Morsi)",
    dateRule: { type: "fixed", date: "06-30" },
    gravity: "contested",
    guidance:
      "A public holiday officially framed as a revolution, while opponents call the events a coup. Avoid \"revolution\"/\"coup\" wording, crowd-in-Tahrir imagery and Muslim Brotherhood references.",
    sourceUrl: "https://en.wikipedia.org/wiki/June_2013_Egyptian_protests",
  },
  {
    id: "eg-revolution-day-jul-23",
    market: "EG",
    label: "Revolution Day (1952)",
    dateRule: { type: "fixed", date: "07-23" },
    gravity: "celebratory",
    guidance:
      "Patriotic creative marking the Free Officers' revolution is expected. Treat the flag, army and Nasser imagery reverently, with no parody.",
    sourceUrl: "https://en.wikipedia.org/wiki/Egyptian_revolution_of_1952",
  },
  {
    id: "eg-rabaa-aug-14",
    market: "EG",
    label: "Rabaa and al-Nahda sit-in dispersal anniversary (2013)",
    dateRule: { type: "fixed", date: "08-14" },
    gravity: "contested",
    guidance:
      "Security forces killed hundreds of pro-Morsi protesters (at least 817 at Rabaa, per Human Rights Watch), and the event is officially framed as a counter-terror operation. Avoid the four-finger \"R4BIA\" hand gesture and yellow-hand graphics, which are read as political statements.",
    sourceUrl: "https://en.wikipedia.org/wiki/August_2013_Rabaa_massacre",
  },
  {
    id: "eg-armed-forces-day-oct-6",
    market: "EG",
    label: "Armed Forces Day (1973 October War crossing)",
    dateRule: { type: "fixed", date: "10-06" },
    gravity: "celebratory",
    guidance:
      "The Suez Canal crossing is celebrated as a national victory, and Sadat was assassinated at the parade on this date in 1981. Avoid military parody, Israel-Egypt war jokes and assassination imagery.",
    sourceUrl: "https://en.wikipedia.org/wiki/Yom_Kippur_War",
  },
  {
    id: "eg-maspero-oct-9",
    market: "EG",
    label: "Maspero massacre anniversary (2011)",
    dateRule: { type: "fixed", date: "10-09" },
    gravity: "contested",
    guidance:
      "Military vehicles crushed and troops fired on mainly Coptic protesters, killing 28; accountability is still disputed. Avoid armoured-vehicle imagery, Coptic-protest visuals and sectarian framing.",
    sourceUrl: "https://en.wikipedia.org/wiki/Maspero_massacre",
  },
];
