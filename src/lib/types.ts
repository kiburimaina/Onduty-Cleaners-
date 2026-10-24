export type HomeSize = "studio" | "1br" | "2br" | "3br" | "4br";

export type WhenKind = "now" | "schedule";

export type LaundryMode = "dropoff" | "collect" | "delivery" | "door";

export type LaundryLoad = "small" | "medium" | "large" | "xl";

export type Cadence = "none" | "weekly" | "biweekly";

export type JobStatus =
  | "searching"
  | "matched"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "complete"
  | "cancelled"
  | "scheduled";

export type JobRole = "customer" | "cleaner";

export type UserRole = "customer" | "cleaner" | "admin";

export type ServiceId =
  | "standard"
  | "deep"
  | "move"
  | "office"
  | "airbnb"
  | "afterparty"
  | "laundry";

export type VettingStatus = "none" | "draft" | "pending" | "needs_info" | "approved" | "rejected";

export type IdType = "national_id" | "passport" | "driving_license";

export type Cleaner = {
  id: string;
  name: string;
  initials: string;
  hue: number;
  rating: number;
  jobs: number;
  years: number;
  specialties: ServiceId[];
  bio: string;
  rate: number;
  languages: string[];
  etaMin: number;
  x: number;
  y: number;
  online: boolean;
  city: string;
};

export type Service = {
  id: ServiceId;
  name: string;
  blurb: string;
  rate: number;
  hoursFactor: number;
  image: string;
  durationLabel: string;
  unit: "hour" | "bag" | "piece";
};

export type ShopOffer = "wash" | "dryclean";

export type LaundryPlant = {
  id: string;
  name: string;
  address: string;
  hours: string;
  walkMin: number;
  x: number;
  y: number;
};

export type DrycleanItem = {
  id: string;
  label: string;
  price: number;
};

export type Job = {
  id: string;
  role: JobRole;
  serviceId: ServiceId;
  size: HomeSize;
  whenKind: WhenKind;
  scheduledFor: string | null;
  address: string;
  notes: string;
  cleanerId: string | null;
  cleanerName: string | null;
  customerId: string;
  customerName: string;
  status: JobStatus;
  createdAt: string;
  etaMinutes: number;
  travelProgress: number;
  cleanProgress: number;
  price: number;
  hours: number;
  rating: number | null;
  tip: number;
  checklist: { id: string; label: string; done: boolean }[];
  laundryMode: LaundryMode | null;
  laundryLoad: LaundryLoad | null;
  plantId: string | null;
  addLaundry: boolean;
  offer: ShopOffer;
  leg: "pickup" | "wash" | "return";
  pieces: { id: string; qty: number }[];
  paymentStatus: "authorized" | "captured" | "voided" | "none";
  customerRating: number | null;
};

export type Place = {
  id: string;
  label: string;
  address: string;
};

export type EarningLine = {
  jobId: string;
  at: string;
  label: string;
  fare: number;
  tip: number;
};

export type PayoutLine = {
  id: string;
  amount: number;
  phone: string;
  at: string;
};

export type Earnings = {
  balance: number;
  paid: number;
  phone: string;
  lines: EarningLine[];
  payouts: PayoutLine[];
};

export type Profile = {
  userId: string;
  name: string;
  role: UserRole;
  phone: string;
  address: string;
};

export type Wallet = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  jobId: string | null;
  read: boolean;
  createdAt: string;
};

export type Payment = {
  id: string;
  jobId: string | null;
  amount: number;
  status: string;
  method: string;
  brand: string | null;
  last4: string | null;
  createdAt: string;
};

export type Dispute = {
  id: string;
  jobId: string;
  userId: string;
  reason: string;
  detail: string;
  status: string;
  resolution: string;
  createdAt: string;
};

export type Ticket = {
  id: string;
  userId: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: { id: string; fromOps: boolean; body: string; createdAt: string }[];
};

export type RecurringPlan = {
  id: string;
  serviceId: ServiceId;
  size: HomeSize;
  laundryMode: LaundryMode | null;
  laundryLoad: LaundryLoad | null;
  plantId: string | null;
  cadence: Exclude<Cadence, "none">;
  address: string;
  notes: string;
  nextAt: string;
  active: boolean;
};

export type VettingSummary = {
  status: VettingStatus;
  staffNote: string;
  submittedAt: string | null;
};

export type VettingDraft = {
  legalName: string;
  phone: string;
  city: string;
  dob: string;
  idType: IdType;
  idNumber: string;
  idExpiry: string;
  conductIssued: string;
  profilePhoto: string;
  idFront: string;
  idBack: string;
  goodConduct: string;
  selfie: string;
  status: VettingStatus;
  staffNote: string;
  submittedAt: string | null;
};

export type VettingQueueItem = {
  userId: string;
  legalName: string;
  phone: string;
  city: string;
  idType: IdType;
  status: VettingStatus;
  submittedAt: string | null;
  staffNote: string;
};

export type Me = {
  profile: Profile;
  wallet: Wallet | null;
  unread: number;
  dutyOnline: boolean;
  isAdmin: boolean;
  vetting: VettingSummary;
  cleared: boolean;
};
