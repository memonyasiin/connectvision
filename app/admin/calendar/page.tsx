// Server component — fetches appointments + employee rosters (or returns
// mocks when the DB isn't reachable yet) and hands them to the client
// CalendarGrid.

import { CalendarGrid } from '@/components/dashboard/CalendarGrid';
import type { AppointmentRow, EmployeeRosterRow } from '@/components/dashboard/CalendarGrid.types';

function buildMockAppointments(): AppointmentRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  return [
    {
      id: 'apt-1', startsAt: at(0, 10), endsAt: at(0, 11), durationMin: 60,
      serviceName: 'Hydrating Facial', status: 'CONFIRMED',
      customerName: 'Aanya Sharma', customerPhone: '+919876543210', customerEmail: 'aanya@example.com',
      customerLocale: 'hi-IN-Latn',
      upiAmountInr: 1499, upiRefId: 'UPI20260530A91827', upiCapturedAt: at(0, 9, 18),
      pataaCustomerId: 'pat_3kx2m', notes: 'Allergic to retinol — confirmed verbally.',
    },
    {
      id: 'apt-2', startsAt: at(0, 14), endsAt: at(0, 14, 30), durationMin: 30,
      serviceName: 'Skin Consultation', status: 'PENDING_CHECKOUT',
      customerName: 'Vikram Iyer', customerPhone: '+919811223344', customerEmail: null,
      customerLocale: 'en-IN',
      upiAmountInr: null, upiRefId: null, upiCapturedAt: null,
      pataaCustomerId: null, notes: null,
    },
    {
      id: 'apt-3', startsAt: at(1, 11), endsAt: at(1, 12), durationMin: 60,
      serviceName: 'Hair Spa', status: 'CONFIRMED',
      customerName: 'Rohit Mehta', customerPhone: '+919900112233', customerEmail: 'rohit.m@example.com',
      customerLocale: 'hi-IN',
      upiAmountInr: 2200, upiRefId: 'UPI20260531B73910', upiCapturedAt: at(1, 8, 0),
      pataaCustomerId: 'pat_p9q1n', notes: null,
    },
    {
      id: 'apt-4', startsAt: at(2, 16), endsAt: at(2, 17), durationMin: 60,
      serviceName: 'Bridal Trial', status: 'CONFIRMED',
      customerName: 'Priya Nair', customerPhone: '+919767891111', customerEmail: 'priya@example.com',
      customerLocale: 'en-IN',
      upiAmountInr: 4999, upiRefId: 'UPI20260601C18247', upiCapturedAt: at(2, 11, 45),
      pataaCustomerId: 'pat_t7r3v', notes: 'Wants a vegan-friendly product set.',
    },
    {
      id: 'apt-5', startsAt: at(3, 9), endsAt: at(3, 10), durationMin: 60,
      serviceName: 'Express Manicure', status: 'AVAILABLE',
      customerName: null, customerPhone: null, customerEmail: null,
      customerLocale: null,
      upiAmountInr: null, upiRefId: null, upiCapturedAt: null,
      pataaCustomerId: null, notes: null,
    },
  ];
}

function buildMockRosters(): EmployeeRosterRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  return [
    {
      id: 'rst-1', employeeId: 'emp-1', employeeName: 'Sanjay Verma', employeeRole: 'Senior Stylist',
      shiftStart: at(0, 9), shiftEnd: at(0, 18),
      status: 'ON_SHIFT', checkInAt: at(0, 9, 4),
      checkOutAt: null, lastActivityAt: new Date(Date.now() - 2 * 60 * 1000),
      productivityScore: 87, inputEventsThisShift: 1842, pataaEmployeeId: 'pwk_x91',
    },
    {
      id: 'rst-2', employeeId: 'emp-2', employeeName: 'Meera Kapoor', employeeRole: 'Esthetician',
      shiftStart: at(0, 10), shiftEnd: at(0, 19),
      status: 'GHOST_STATE', checkInAt: at(0, 10, 2),
      checkOutAt: null, lastActivityAt: new Date(Date.now() - 47 * 60 * 1000),
      productivityScore: 12, inputEventsThisShift: 198, pataaEmployeeId: 'pwk_y44',
    },
    {
      id: 'rst-3', employeeId: 'emp-3', employeeName: 'Karan Bhatia', employeeRole: 'Receptionist',
      shiftStart: at(0, 8), shiftEnd: at(0, 17),
      status: 'OVERDUE_ABSENT', checkInAt: null,
      checkOutAt: null, lastActivityAt: null,
      productivityScore: 0, inputEventsThisShift: 0, pataaEmployeeId: 'pwk_z02',
    },
    {
      id: 'rst-4', employeeId: 'emp-4', employeeName: 'Nikita Joshi', employeeRole: 'Trainee Stylist',
      shiftStart: at(1, 12), shiftEnd: at(1, 20),
      status: 'AWAITING_CHECKIN', checkInAt: null,
      checkOutAt: null, lastActivityAt: null,
      productivityScore: null, inputEventsThisShift: 0, pataaEmployeeId: null,
    },
    {
      id: 'rst-5', employeeId: 'emp-1', employeeName: 'Sanjay Verma', employeeRole: 'Senior Stylist',
      shiftStart: at(2, 9), shiftEnd: at(2, 18),
      status: 'SCHEDULED', checkInAt: null,
      checkOutAt: null, lastActivityAt: null,
      productivityScore: null, inputEventsThisShift: 0, pataaEmployeeId: 'pwk_x91',
    },
  ];
}

export default function AdminCalendarPage() {
  // TODO production: replace with Prisma fetches scoped by signed-in operator.
  const appointments = buildMockAppointments();
  const employeeRosters = buildMockRosters();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <CalendarGrid
          appointments={appointments}
          employeeRosters={employeeRosters}
          locale="hi-IN-Latn"
          pataaCustomerUrlTemplate="https://pataainternational.com/crm/customers/{{id}}"
        />
      </div>
    </main>
  );
}
