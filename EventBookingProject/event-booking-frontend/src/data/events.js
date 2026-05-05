// Initial event data — stored and updated via localStorage
export const INITIAL_EVENTS = [
  {
    id: '1',
    eventName: 'TechVision 2025 – National Technical Symposium',
    department: 'CSE',
    date: '2025-05-15',
    time: '09:00',
    venue: 'Seminar Hall A, Main Block',
    price: 150,
    totalTickets: 200,
    availableTickets: 47,
    description:
      'A grand technical symposium featuring paper presentations, coding contests, and keynote sessions by industry leaders from top tech companies.',
  },
  {
    id: '2',
    eventName: 'IoT & Embedded Systems Workshop',
    department: 'ECE',
    date: '2025-05-22',
    time: '10:00',
    venue: 'Electronics Lab, Block C',
    price: 200,
    totalTickets: 60,
    availableTickets: 12,
    description:
      'Hands-on workshop covering Arduino, Raspberry Pi, and real-world IoT sensor integration. Build your own smart device in one day!',
  },
  {
    id: '3',
    eventName: 'Management Conclave & Case Study Competition',
    department: 'MBA',
    date: '2025-06-01',
    time: '11:00',
    venue: 'Conference Room 1, Admin Block',
    price: 0,
    totalTickets: 100,
    availableTickets: 85,
    description:
      'A premier management event with live case study rounds, panel discussions with CEOs, and networking with industry professionals.',
  },
  {
    id: '4',
    eventName: 'CodeStorm – 24-Hour Hackathon',
    department: 'IT',
    date: '2025-06-10',
    time: '08:00',
    venue: 'Innovation Hub, IT Block',
    price: 100,
    totalTickets: 150,
    availableTickets: 0,
    description:
      'A 24-hour hackathon challenging participants to build innovative solutions. Prizes worth ₹1 Lakh! Register your team of 3–4 members.',
  },
  {
    id: '5',
    eventName: 'RoboWars – Robotics Competition',
    department: 'MECH',
    date: '2025-06-18',
    time: '09:30',
    venue: 'Sports Arena, Ground Floor',
    price: 250,
    totalTickets: 80,
    availableTickets: 23,
    description:
      'Watch or enter your robot into intense battle rounds! Open to all engineering departments. Design, build, and fight!',
  },
  {
    id: '6',
    eventName: 'Power Systems & Smart Grid Seminar',
    department: 'EEE',
    date: '2025-07-05',
    time: '10:30',
    venue: 'Seminar Hall B, Engineering Block',
    price: 50,
    totalTickets: 120,
    availableTickets: 98,
    description:
      'In-depth seminar on modern power systems, smart grid technologies, and renewable energy integration. Open for all EEE students.',
  },
];

export const DEPARTMENTS = ['All', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA'];

// Unique ID for bookings
export function generateBookingRef() {
  return 'EVT-' + Math.random().toString(36).toUpperCase().substring(2, 10);
}
