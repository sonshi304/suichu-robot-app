import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ━━━ Members ━━━
export type Member = {
  id: string;
  name: string;
  grade: number;
  role: string;
};

const DEFAULT_MEMBERS: Omit<Member, "id">[] = [
  { name: "石原航太", grade: 3, role: "部長" },
  { name: "崎山耕円", grade: 3, role: "" },
  { name: "新垣聖成", grade: 3, role: "" },
  { name: "金城弘昌", grade: 3, role: "" },
  { name: "西平愛宙", grade: 2, role: "" },
  { name: "眞榮里隆飛斗", grade: 2, role: "" },
  { name: "與那覇俊喜", grade: 1, role: "" },
  { name: "與那覇楽俊", grade: 1, role: "" },
];

export async function getMembers(): Promise<Member[]> {
  const snap = await getDocs(collection(db, "members"));
  if (snap.empty) {
    // Initialize with defaults
    for (let i = 0; i < DEFAULT_MEMBERS.length; i++) {
      const id = String(i + 1);
      await setDoc(doc(db, "members", id), { ...DEFAULT_MEMBERS[i], id });
    }
    return DEFAULT_MEMBERS.map((m, i) => ({ ...m, id: String(i + 1) }));
  }
  return snap.docs.map((d) => d.data() as Member);
}

export async function addMember(member: Omit<Member, "id">): Promise<Member> {
  const snap = await getDocs(collection(db, "members"));
  const maxId = snap.docs.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0);
  const id = String(maxId + 1);
  const full = { ...member, id };
  await setDoc(doc(db, "members", id), full);
  return full;
}

export async function updateMember(member: Member): Promise<void> {
  await setDoc(doc(db, "members", member.id), member);
}

export async function deleteMember(id: string): Promise<void> {
  await deleteDoc(doc(db, "members", id));
}

export function onMembersChange(callback: (members: Member[]) => void) {
  return onSnapshot(collection(db, "members"), (snap) => {
    callback(snap.docs.map((d) => d.data() as Member));
  });
}

// ━━━ Activities ━━━
export type Activity = {
  date: string; // "YYYY-MM-DD"
  title: string;
  time: string;
  memo: string;
};

export async function getActivities(): Promise<Record<string, Activity>> {
  const snap = await getDocs(collection(db, "activities"));
  const result: Record<string, Activity> = {};
  snap.docs.forEach((d) => {
    result[d.id] = d.data() as Activity;
  });
  return result;
}

export async function setActivity(date: string, activity: Omit<Activity, "date">): Promise<void> {
  await setDoc(doc(db, "activities", date), { ...activity, date });
}

export async function deleteActivity(date: string): Promise<void> {
  await deleteDoc(doc(db, "activities", date));
}

export function onActivitiesChange(callback: (activities: Record<string, Activity>) => void) {
  return onSnapshot(collection(db, "activities"), (snap) => {
    const result: Record<string, Activity> = {};
    snap.docs.forEach((d) => {
      result[d.id] = d.data() as Activity;
    });
    callback(result);
  });
}

// ━━━ Reservations ━━━
// Stored as: reservations/{date} -> { members: string[] }

export async function getReservations(): Promise<Record<string, string[]>> {
  const snap = await getDocs(collection(db, "reservations"));
  const result: Record<string, string[]> = {};
  snap.docs.forEach((d) => {
    result[d.id] = (d.data().members || []) as string[];
  });
  return result;
}

export async function toggleReservation(date: string, memberId: string): Promise<void> {
  const ref = doc(db, "reservations", date);
  const snap = await getDoc(ref);
  const current: string[] = snap.exists() ? (snap.data().members || []) : [];

  if (current.includes(memberId)) {
    await setDoc(ref, { members: current.filter((id) => id !== memberId) });
  } else {
    await setDoc(ref, { members: [...current, memberId] });
  }
}

export function onReservationsChange(callback: (res: Record<string, string[]>) => void) {
  return onSnapshot(collection(db, "reservations"), (snap) => {
    const result: Record<string, string[]> = {};
    snap.docs.forEach((d) => {
      result[d.id] = (d.data().members || []) as string[];
    });
    callback(result);
  });
}

// ━━━ Check-ins ━━━
export type CheckinRecord = {
  inTime: string | null;  // ISO string
  outTime: string | null; // ISO string
};

export async function getCheckins(): Promise<Record<string, Record<string, CheckinRecord>>> {
  const snap = await getDocs(collection(db, "checkins"));
  const result: Record<string, Record<string, CheckinRecord>> = {};
  snap.docs.forEach((d) => {
    result[d.id] = d.data() as Record<string, CheckinRecord>;
  });
  return result;
}

export async function checkIn(date: string, memberId: string): Promise<"in" | "out"> {
  const ref = doc(db, "checkins", date);
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data() : {};
  const memberRecord = current[memberId] as CheckinRecord | undefined;

  const now = new Date().toISOString();

  if (!memberRecord || !memberRecord.inTime) {
    // Check in
    await setDoc(ref, { ...current, [memberId]: { inTime: now, outTime: null } });
    return "in";
  } else if (!memberRecord.outTime) {
    // Check out
    await setDoc(ref, { ...current, [memberId]: { ...memberRecord, outTime: now } });
    return "out";
  } else {
    // Re-enter
    await setDoc(ref, { ...current, [memberId]: { inTime: now, outTime: null } });
    return "in";
  }
}

export function onCheckinsChange(date: string, callback: (data: Record<string, CheckinRecord>) => void) {
  return onSnapshot(doc(db, "checkins", date), (snap) => {
    callback(snap.exists() ? (snap.data() as Record<string, CheckinRecord>) : {});
  });
}

// ━━━ Announcements ━━━
export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
  createdAt: number;
};

export async function getAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => d.data() as Announcement);
}

export async function addAnnouncement(ann: Omit<Announcement, "id" | "createdAt">): Promise<void> {
  const id = Date.now().toString();
  await setDoc(doc(db, "announcements", id), { ...ann, id, createdAt: Date.now() });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, "announcements", id));
}

export function onAnnouncementsChange(callback: (anns: Announcement[]) => void) {
  return onSnapshot(query(collection(db, "announcements"), orderBy("createdAt", "desc")), (snap) => {
    callback(snap.docs.map((d) => d.data() as Announcement));
  });
}

// ━━━ Utility ━━━
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function diffMinutes(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

export { db };
