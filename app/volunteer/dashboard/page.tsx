// app/volunteer/dashboard/page.tsx
// Version: 2.0.0 - Replaced by My volunteer listings (/volunteer/mine); this address now sends people there
// Previous: 1.0.5 - Clean rebuild with verified syntax
// Date: 2026-10-13
import { redirect } from 'next/navigation';

export default function VolunteerDashboard() {
  redirect('/volunteer/mine');
}
