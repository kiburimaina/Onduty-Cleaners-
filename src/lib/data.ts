import type {
  Cleaner,
  HomeSize,
  JobStatus,
  LaundryLoad,
  LaundryMode,
  LaundryPlant,
  Service,
  ServiceId,
} from "./types";

export const SERVICES: Service[] = [
  {
    id: "standard",
    name: "Standard home",
    blurb: "Beds, baths, kitchen, and floors. The weekly reset.",
    rate: 42,
    hoursFactor: 1,
    image: "/images/living.jpg",
    durationLabel: "2–4 hr",
    unit: "hour",
  },
  {
    id: "deep",
    name: "Deep clean",
    blurb: "Baseboards, inside appliances, detail work. Seasonal reset.",
    rate: 56,
    hoursFactor: 1.45,
    image: "/images/kitchen.jpg",
    durationLabel: "4–6 hr",
    unit: "hour",
  },
  {
    id: "move",
    name: "Move-in / out",
    blurb: "Empty-home clean that satisfies landlords and new keys.",
    rate: 62,
    hoursFactor: 1.7,
    image: "/images/bedroom.jpg",
    durationLabel: "4–8 hr",
    unit: "hour",
  },
  {
    id: "office",
    name: "Office",
    blurb: "Desks, kitchens, and shared rooms after hours.",
    rate: 48,
    hoursFactor: 1.1,
    image: "/images/kitchen.jpg",
    durationLabel: "2–5 hr",
    unit: "hour",
  },
  {
    id: "airbnb",
    name: "Turnover",
    blurb: "Guest-ready between stays. Linens, restock, checklist.",
    rate: 52,
    hoursFactor: 0.9,
    image: "/images/bedroom.jpg",
    durationLabel: "90 min",
    unit: "hour",
  },
  {
    id: "afterparty",
    name: "After hours",
    blurb: "Same-night rescue after a dinner, shoot, or gathering.",
    rate: 68,
    hoursFactor: 1.2,
    image: "/images/tools.jpg",
    durationLabel: "2–3 hr",
    unit: "hour",
  },
  {
    id: "laundry",
    name: "Laundry",
    blurb: "Wash-and-fold or dry clean. Drop off, we collect, or we bring it back.",
    rate: 18,
    hoursFactor: 0.25,
    image: "/images/laundry.jpg",
    durationLabel: "Same day",
    unit: "bag",
  },
];

export const HOME_SIZES: { id: HomeSize; label: string; hours: number }[] = [
  { id: "studio", label: "Studio", hours: 1.5 },
  { id: "1br", label: "1 bed", hours: 2 },
  { id: "2br", label: "2 bed", hours: 3 },
  { id: "3br", label: "3 bed", hours: 4 },
  { id: "4br", label: "4+ bed", hours: 5.5 },
];

export const LAUNDRY_LOADS: { id: LaundryLoad; label: string; kg: string; price: number }[] = [
  { id: "small", label: "Small", kg: "up to 5 kg", price: 18 },
  { id: "medium", label: "Medium", kg: "5–10 kg", price: 28 },
  { id: "large", label: "Large", kg: "10–15 kg", price: 42 },
  { id: "xl", label: "Family", kg: "15 kg+", price: 58 },
];

export const COLLECT_FEE = 14;
export const RETURN_FEE = 12;
export const CREW_SHARE = 0.78;

export const DRYCLEAN_ITEMS: { id: string; label: string; price: number }[] = [
  { id: "shirt", label: "Shirt", price: 6 },
  { id: "blouse", label: "Blouse", price: 8 },
  { id: "trousers", label: "Trousers", price: 9 },
  { id: "dress", label: "Dress", price: 14 },
  { id: "suit", label: "Suit", price: 22 },
  { id: "coat", label: "Coat", price: 18 },
  { id: "duvet", label: "Duvet", price: 24 },
];

export function pieceTotal(pieces: { id: string; qty: number }[] | null | undefined) {
  if (!pieces) return 0;
  return pieces.reduce((sum, p) => {
    const item = DRYCLEAN_ITEMS.find((d) => d.id === p.id);
    return sum + (item ? item.price * Math.max(0, p.qty) : 0);
  }, 0);
}

export const PLANTS: LaundryPlant[] = [
  {
    id: "harbor",
    name: "Harbor Wash",
    address: "12 Harbor Walk",
    hours: "Open 6am–10pm",
    walkMin: 8,
    x: 72,
    y: 42,
  },
  {
    id: "oak",
    name: "Oak Street Wash",
    address: "401 Oak St",
    hours: "Open 7am–9pm",
    walkMin: 11,
    x: 22,
    y: 64,
  },
  {
    id: "north",
    name: "North Hill Wash",
    address: "88 Pine Court",
    hours: "Open 6am–8pm",
    walkMin: 16,
    x: 80,
    y: 24,
  },
];

export const CLEANERS: Cleaner[] = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    hue: 198,
    rating: 4.98,
    jobs: 1240,
    years: 6,
    specialties: ["standard", "deep", "airbnb"],
    bio: "Detail-first and quiet in the home. Maya runs a two-person crew for larger deep cleans and is booked most weekend mornings.",
    rate: 48,
    languages: ["English", "Mandarin"],
    etaMin: 7,
    x: 28,
    y: 34,
    online: true,
    city: "Riverside",
  },
  {
    id: "jordan",
    name: "Jordan Hale",
    initials: "JH",
    hue: 210,
    rating: 4.95,
    jobs: 890,
    years: 4,
    specialties: ["standard", "office", "afterparty", "laundry"],
    bio: "Former hotel housekeeping lead. Fast on collect runs and used to working around people still in the space.",
    rate: 44,
    languages: ["English"],
    etaMin: 11,
    x: 62,
    y: 22,
    online: true,
    city: "Riverside",
  },
  {
    id: "priya",
    name: "Priya Nair",
    initials: "PN",
    hue: 186,
    rating: 4.99,
    jobs: 2104,
    years: 9,
    specialties: ["deep", "move", "standard"],
    bio: "The closer. Priya takes move-outs other crews won't touch and leaves them photo-ready for listings.",
    rate: 58,
    languages: ["English", "Hindi", "Tamil"],
    etaMin: 14,
    x: 74,
    y: 58,
    online: true,
    city: "Harbor East",
  },
  {
    id: "luis",
    name: "Luis Ortega",
    initials: "LO",
    hue: 204,
    rating: 4.92,
    jobs: 670,
    years: 3,
    specialties: ["office", "standard", "afterparty", "laundry"],
    bio: "Evenings, offices, and laundry collect. Luis keeps a van stocked for after-hours work and same-day bag runs.",
    rate: 46,
    languages: ["English", "Spanish"],
    etaMin: 9,
    x: 40,
    y: 70,
    online: true,
    city: "Riverside",
  },
  {
    id: "amina",
    name: "Amina Diallo",
    initials: "AD",
    hue: 192,
    rating: 4.97,
    jobs: 1540,
    years: 7,
    specialties: ["airbnb", "standard", "deep", "laundry"],
    bio: "Hosts trust her turnovers and linen loads. Amina photographs the reset and runs laundry collect for guest stays.",
    rate: 50,
    languages: ["English", "French"],
    etaMin: 6,
    x: 18,
    y: 56,
    online: true,
    city: "Riverside",
  },
  {
    id: "noah",
    name: "Noah Berg",
    initials: "NB",
    hue: 216,
    rating: 4.91,
    jobs: 430,
    years: 2,
    specialties: ["standard", "move"],
    bio: "Calm, punctual, and great with pets in the home. Prefers weekday mornings.",
    rate: 40,
    languages: ["English", "Swedish"],
    etaMin: 16,
    x: 82,
    y: 30,
    online: true,
    city: "North Hill",
  },
  {
    id: "elena",
    name: "Elena Voss",
    initials: "EV",
    hue: 174,
    rating: 4.96,
    jobs: 980,
    years: 5,
    specialties: ["deep", "office", "airbnb", "laundry"],
    bio: "Green-product specialist. Elena brings her own unscented line and handles allergy-sensitive laundry loads.",
    rate: 52,
    languages: ["English", "German"],
    etaMin: 12,
    x: 52,
    y: 44,
    online: true,
    city: "Riverside",
  },
  {
    id: "caleb",
    name: "Caleb Wright",
    initials: "CW",
    hue: 220,
    rating: 4.88,
    jobs: 310,
    years: 2,
    specialties: ["move", "afterparty", "standard"],
    bio: "Heavy lifts and post-event resets. Pair him with Priya for empty-home move-outs.",
    rate: 44,
    languages: ["English"],
    etaMin: 18,
    x: 66,
    y: 78,
    online: false,
    city: "Harbor East",
  },
];

export const DEFAULT_ADDRESS = "284 Riverside Ave";

export const CHECKLISTS: Record<ServiceId, string[]> = {
  standard: [
    "Kitchen surfaces and sink",
    "Bathrooms reset",
    "Floors vacuumed and mopped",
    "Beds made, clutter reset",
    "Trash out",
  ],
  deep: [
    "Inside oven and fridge",
    "Baseboards and tracks",
    "Tile and grout detail",
    "Interior windows",
    "Closets and shelves",
    "Kitchen surfaces and sink",
  ],
  move: [
    "Empty cabinets wiped",
    "Appliances inside and out",
    "Walls and switches",
    "Floors edge to edge",
    "Bathrooms descaled",
    "Final walkthrough photos",
  ],
  office: [
    "Desks and shared tables",
    "Kitchen / break room",
    "Restrooms",
    "Floors and glass",
    "Trash and recycling",
  ],
  airbnb: [
    "Linens changed",
    "Bathroom restock",
    "Kitchen guest-ready",
    "Floors and surfaces",
    "Turnover photos sent",
  ],
  afterparty: [
    "Dishes and counters",
    "Floors and spills",
    "Trash and recycling",
    "Bathrooms reset",
    "Living areas restored",
  ],
  laundry: [
    "Bags tagged and sorted",
    "Wash cycle",
    "Dry and check labels",
    "Fold and pack",
    "Ready for pickup",
  ],
};

export function serviceById(id: ServiceId) {
  return SERVICES.find((s) => s.id === id) ?? SERVICES[0];
}

export function cleanerById(id: string | null) {
  if (!id) return null;
  return CLEANERS.find((c) => c.id === id) ?? null;
}

export function plantById(id: string | null | undefined) {
  if (!id) return PLANTS[0]!;
  return PLANTS.find((p) => p.id === id) ?? PLANTS[0]!;
}

export function loadById(id: LaundryLoad | null | undefined) {
  return LAUNDRY_LOADS.find((l) => l.id === id) ?? LAUNDRY_LOADS[1]!;
}

export function quoteHours(serviceId: ServiceId, size: HomeSize) {
  if (serviceId === "laundry") return 0.5;
  const service = serviceById(serviceId);
  const sizeHours = HOME_SIZES.find((s) => s.id === size)?.hours ?? 2;
  return Math.round(sizeHours * service.hoursFactor * 2) / 2;
}

export function quotePrice(
  serviceId: ServiceId,
  size: HomeSize,
  cleanerRate?: number,
  laundry?: {
    mode: LaundryMode;
    load: LaundryLoad;
    addLaundry?: boolean;
    offer?: "wash" | "dryclean";
    pieces?: { id: string; qty: number }[];
  },
) {
  let total = 0;
  if (serviceId === "laundry" && laundry?.offer === "dryclean") {
    total = pieceTotal(laundry.pieces);
    if (laundry.mode === "collect") total += COLLECT_FEE;
    if (laundry.mode === "delivery") total += COLLECT_FEE + RETURN_FEE;
  } else if (serviceId === "laundry") {
    const load = loadById(laundry?.load);
    const fee = laundry?.mode === "collect" ? COLLECT_FEE : laundry?.mode === "delivery" ? COLLECT_FEE + RETURN_FEE : 0;
    total = load.price + fee;
  } else {
    const service = serviceById(serviceId);
    const hours = quoteHours(serviceId, size);
    const rate = cleanerRate ?? service.rate;
    total = Math.round(hours * rate);
    if (laundry?.addLaundry) {
      total += loadById(laundry.load ?? "medium").price + COLLECT_FEE;
    }
  }
  return total;
}

export function nearestCleaners(serviceId: ServiceId, count = 4) {
  const matched = CLEANERS.filter((c) => c.online && c.specialties.includes(serviceId)).sort(
    (a, b) => a.etaMin - b.etaMin,
  );
  if (matched.length > 0) return matched.slice(0, count);
  return CLEANERS.filter((c) => c.online)
    .sort((a, b) => a.etaMin - b.etaMin)
    .slice(0, count);
}

export const STEPS = [
  {
    n: "01",
    title: "Drop a pin",
    body: "Address, home size, and the kind of clean — or a laundry bag. Under a minute.",
  },
  {
    n: "02",
    title: "We match",
    body: "A nearby crew, or a wash plant. You see rating, ETA, and price before you confirm.",
  },
  {
    n: "03",
    title: "They arrive",
    body: "Live tracking to the door, a checklist in the job, and a receipt when it's done.",
  },
];

export const TRUST = [
  { title: "Vetted", body: "National ID, a live selfie, and a certificate of good conduct. Staff reviews every file before anyone goes online." },
  { title: "Insured", body: "Every job is covered. Damage and theft protection on the booking." },
  { title: "Rated", body: "Two-way reviews after every visit. High bar to stay on the roster." },
  { title: "On the clock", body: "Live ETA, in-app status, and a real person if something slips." },
];

export const LIVE_STATUSES: JobStatus[] = [
  "searching",
  "matched",
  "en_route",
  "arrived",
  "in_progress",
];

export function jobHeadline(job: {
  status: JobStatus;
  serviceId?: ServiceId;
  laundryMode?: LaundryMode | null;
  offer?: "wash" | "dryclean";
  leg?: "pickup" | "wash" | "return";
}) {
  const laundry = job.serviceId === "laundry";
  const dropoff = laundry && job.laundryMode === "dropoff";
  const delivery = laundry && job.laundryMode === "delivery";
  const dry = laundry && job.offer === "dryclean";
  switch (job.status) {
    case "searching":
      if (dropoff) return "Holding a slot";
      if (laundry) return dry ? "Finding a collector" : "Finding a collector";
      return "Finding a cleaner";
    case "matched":
      if (dropoff) return "Drop-off reserved";
      if (laundry) return "Collector confirmed";
      return "Cleaner confirmed";
    case "en_route":
      if (job.leg === "return") return "Bringing it back";
      return laundry ? "Collecting" : "On the way";
    case "arrived":
      return laundry ? "Bags in hand" : "At the door";
    case "in_progress":
      if (dry) return "At the presser";
      return laundry ? "In the wash" : "Cleaning in progress";
    case "complete":
      if (delivery) return "Delivered";
      if (dropoff || laundry) return "Ready for pickup";
      return "Job complete";
    case "cancelled":
      return "Cancelled";
    case "scheduled":
      return "Scheduled";
  }
}

export function buildChecklist(
  serviceId: ServiceId,
  addLaundry = false,
  opts?: { offer?: "wash" | "dryclean"; mode?: LaundryMode | null },
) {
  if (serviceId === "laundry" && opts?.offer === "dryclean") {
    const items = ["Pieces tagged", "Spot clean and press", "Bagged and checked"];
    items.push(opts.mode === "delivery" ? "Delivered home" : "Ready for pickup");
    return items.map((label, i) => ({ id: `c${i}`, label, done: false }));
  }
  const items = [...CHECKLISTS[serviceId]];
  if (serviceId === "laundry" && opts?.mode === "delivery") {
    const pickup = items.indexOf("Ready for pickup");
    if (pickup >= 0) items[pickup] = "Delivered home";
    else items.push("Delivered home");
  }
  if (addLaundry && serviceId !== "laundry") {
    items.push("Laundry bags collected", "Wash, dry, fold");
  }
  return items.map((label, i) => ({ id: `c${i}`, label, done: false }));
}
