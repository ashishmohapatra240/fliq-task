"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useCreatePreference,
  useGetPreference,
  useUpdatePreference,
  useDeletePreference,
} from "./hooks/usePreference";

interface Preference {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  dateTime: string;
}

export default function Home() {
  const { mutate: createPreference } = useCreatePreference();
  const { mutate: updatePreference } = useUpdatePreference();
  const { mutate: deletePreference } = useDeletePreference();
  const { data: preferences = [], isLoading } = useGetPreference();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [dateTime, setDateTime] = useState<string>("");

  const timeZones = useMemo<string[]>(() => {
    if (
      typeof Intl !== "undefined" &&
      typeof Intl.supportedValuesOf === "function"
    ) {
      return Intl.supportedValuesOf("timeZone");
    }

    return [
      "UTC",
      "Europe/London",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Kolkata",
      "America/New_York",
      "America/Los_Angeles",
      "Australia/Sydney",
    ];
  }, []);

  const systemTimeZone = useMemo<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }, []);

  const [selectedTimeZone, setSelectedTimeZone] =
    useState<string>(systemTimeZone);
  const [now, setNow] = useState<Date>(() => new Date());

  const getTimezoneOffsetMinutes = (timeZone: string, date: Date): number => {
    const localeDate = new Date(
      date.toLocaleString("en-US", { timeZone, hour12: false })
    );
    return (localeDate.getTime() - date.getTime()) / 60000;
  };

  const convertToDateTimeLocal = (date: Date, timeZone: string): string => {
    if (!timeZone) return "";
    
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  };

  const convertFromDateTimeLocal = (
    dateTimeLocal: string,
    timeZone: string
  ): string => {
    if (!dateTimeLocal || !timeZone) return "";

    // Parse the datetime-local value as if it were in local timezone
    const localDate = new Date(dateTimeLocal);
    
    // Get the offset difference between target timezone and local timezone
    const tzOffset = getTimezoneOffsetMinutes(timeZone, localDate);
    
    // Adjust to get the correct UTC time
    // tzOffset = offset_tz - offset_local, so we subtract it to convert to UTC
    const utcDate = new Date(localDate.getTime() - tzOffset * 60000);
    return utcDate.toISOString();
  };

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!timeZones.length) return;

    if (!selectedTimeZone) {
      const initialTz =
        (systemTimeZone &&
          timeZones.includes(systemTimeZone) &&
          systemTimeZone) ||
        timeZones[0];

      setSelectedTimeZone(initialTz);
      if (!editingId) {
        setDateTime(convertToDateTimeLocal(new Date(), initialTz));
      }
    } else if (!dateTime && !editingId) {
      setDateTime(convertToDateTimeLocal(new Date(), selectedTimeZone));
    }
  }, [timeZones, systemTimeZone, selectedTimeZone, dateTime, editingId]);

  useEffect(() => {
    if (selectedTimeZone && !editingId) {
      const currentTimeInTz = convertToDateTimeLocal(
        new Date(),
        selectedTimeZone
      );
      setDateTime(currentTimeInTz);
    }
  }, [selectedTimeZone]);

  const formattedDateTime = useMemo(() => {
    if (!selectedTimeZone) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: selectedTimeZone,
      }).format(now);
    } catch {
      return now.toLocaleString();
    }
  }, [now, selectedTimeZone]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhoneNumber("");
    if (selectedTimeZone) {
      setDateTime(convertToDateTimeLocal(new Date(), selectedTimeZone));
    }
    setEditingId(null);
  };

  const handleEdit = (preference: Preference) => {
    setName(preference.name);
    setEmail(preference.email);
    setPhoneNumber(preference.phoneNumber);
    const prefDate = new Date(preference.dateTime);
    if (selectedTimeZone) {
      setDateTime(convertToDateTimeLocal(prefDate, selectedTimeZone));
    }
    setEditingId(preference.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isoDateTime = selectedTimeZone
      ? convertFromDateTimeLocal(dateTime, selectedTimeZone)
      : new Date(dateTime).toISOString();

    const formData = {
      name,
      email,
      phoneNumber,
      dateTime: isoDateTime,
    };

    if (editingId) {
      updatePreference({ id: editingId, data: formData });
    } else {
      createPreference(formData);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this preference?")) {
      deletePreference(id);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Preference Form</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Preference" : "Create New Preference"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter your name"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Enter your email"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="Enter your phone number"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <select
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-200"
              value={selectedTimeZone}
              onChange={(e) => {
                const newTz = e.target.value;
                setSelectedTimeZone(newTz);

                if (newTz && !editingId) {
                  setDateTime(convertToDateTimeLocal(new Date(), newTz));
                }
              }}
              required
            >
              {timeZones.map((timeZone) => (
                <option key={timeZone} value={timeZone}>
                  {timeZone}
                </option>
              ))}
            </select>

            {formattedDateTime && (
              <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                Current time in {selectedTimeZone}: {formattedDateTime}
              </div>
            )}

            <input
              type="datetime-local"
              className="border-2 border-gray-300 rounded-md p-2 focus:outline-none focus:border-neutral-300"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-black hover:bg-neutral-800 text-white rounded-md p-2 flex-1 transition-colors cursor-pointer"
              >
                {editingId ? "Update" : "Submit"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white rounded-md p-2 px-4 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-4">Saved Preferences</h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : preferences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No preferences yet. Create one above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {preferences.map((preference: Preference) => (
                <div
                  key={preference.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">
                      {preference.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Email:</span>{" "}
                      {preference.email}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Phone:</span>{" "}
                      {preference.phoneNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Date/Time:</span>{" "}
                      {new Date(preference.dateTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(preference)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-md px-4 py-2 flex-1 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(preference.id)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-md px-4 py-2 flex-1 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
