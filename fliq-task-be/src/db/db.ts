export interface Preference {
  id: string;
  name: string;
  email: string;
  dateTime: string;
  phoneNumber: string;
  timeZone?: string;
}

const db: { preferences: Preference[] } = {
  preferences: [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      dateTime: "2025-01-01T10:00:00Z",
      phoneNumber: "1234567890",
    },
  ],
};

export default db;
