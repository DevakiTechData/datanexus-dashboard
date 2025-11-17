import { useEffect, useMemo, useState } from 'react';
import { loadAllData } from '../data/loadData';
import PageHero from '../components/PageHero';

const EVENTS_HERO_IMAGES = [
  {
    src: '/assets/hero/event img2.jpeg',
    alt: 'Innovation showcase hosted at SLU',
    caption: 'Innovation labs, mentorship circles, and employer showcases across DataNexus.',
  },
  {
    src: '/assets/hero/engagement img1.jpeg',
    alt: 'Alumni and employers collaborating',
    caption: 'Alumni, students, and employers collaborating to power career momentum.',
  },
  {
    src: '/assets/hero/campus img1.jpg',
    alt: 'Saint Louis University campus quad',
    caption: 'An inspiring campus backdrop for lifelong connections.',
  },
];

const EVENT_CARD_IMAGES = [
  '/assets/hero/alumni banner img1.jpg',
  '/assets/hero/Alumni img1.jpg',
  '/assets/hero/engagement img1.jpeg',
  '/assets/hero/event img2.jpeg',
  '/assets/hero/Alumni img5.jpg',
  '/assets/hero/campus img1.jpg',
];

const getImageForIndex = (idx) => EVENT_CARD_IMAGES[idx % EVENT_CARD_IMAGES.length];

const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const Events = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    audienceType: 'employer',
    companyName: '',
    studentId: '',
    currentCompany: '',
    relationshipInterest: true,
    applicationsSubmitted: '',
    upcomingEventId: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const loaded = await loadAllData();
      setData(loaded);
      setLoading(false);
    };
    fetchData();
  }, []);

  const processed = useMemo(() => {
    if (!data) return null;

    const now = new Date();
    const enhancedEvents = data.events.map((event, idx) => {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const isValidDate = !Number.isNaN(startDate.getTime());
      return {
        ...event,
        startDate,
        endDate,
        isValidDate,
        heroImage: getImageForIndex(idx),
      };
    });

    const upcoming = enhancedEvents
      .filter((event) => event.isValidDate && event.startDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, 9);

    const past = enhancedEvents
      .filter((event) => event.isValidDate && event.startDate < now)
      .sort((a, b) => b.startDate - a.startDate)
      .slice(0, 9);

    const monthBuckets = upcoming.reduce((acc, event) => {
      const key = event.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});

    const engagementStats = {
      totalEvents: enhancedEvents.length,
      upcomingCount: upcoming.length,
      pastCount: past.length,
      uniqueLocations: new Set(enhancedEvents.map((ev) => ev.city || ev.hq_city || 'Virtual')).size,
      capacityTotal: enhancedEvents.reduce((sum, ev) => sum + Number(ev.capacity || 0), 0),
    };

    return {
      upcoming,
      past,
      monthBuckets,
      engagementStats,
    };
  }, [data]);

  const pastEvents = processed?.past ?? [];

  const eventTypeInsights = useMemo(() => {
    if (pastEvents.length === 0) return [];
    const summary = pastEvents.reduce((acc, event) => {
      const type = event.event_type || 'Engagement Experience';
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          latestDate: event.startDate,
          city: event.city || event.venue || 'Virtual',
          organizer: event.organizer_name || 'SLU DataNexus',
        };
      }
      acc[type].count += 1;
      if (event.startDate > acc[type].latestDate) {
        acc[type].latestDate = event.startDate;
        acc[type].city = event.city || event.venue || 'Virtual';
        acc[type].organizer = event.organizer_name || 'SLU DataNexus';
      }
      return acc;
    }, {});

    return Object.entries(summary)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([type, info]) => ({
        type,
        count: info.count,
        latestDate: info.latestDate,
        city: info.city,
        organizer: info.organizer,
      }));
  }, [pastEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sluBlue">
        Loading events...
      </div>
    );
  }

  if (!processed) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Unable to load events data.
      </div>
    );
  }

  const { upcoming, past, monthBuckets, engagementStats } = processed;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 pb-16">
      <PageHero
        images={EVENTS_HERO_IMAGES}
        eyebrow="SLU DataNexus Events"
        title="Connect. Engage. Lead."
        subtitle="Explore the events powering our alumni and employer community"
        description="From mentorship labs to innovation summits, DataNexus events bring together alumni, students, and employer partners to share knowledge, build networks, and create impact."
        actions={[
          { href: '#connect', label: 'Connect with Us' },
          { href: '#calendar', label: 'View Event Calendar', variant: 'secondary' },
        ]}
      />

      {/* Engagement Highlights */}
      <section className="max-w-6xl mx-auto px-6 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <p className="text-sm uppercase tracking-wide text-slate-500">Total Events</p>
            <p className="text-3xl font-bold text-sluBlue">{engagementStats.totalEvents}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <p className="text-sm uppercase tracking-wide text-slate-500">Upcoming</p>
            <p className="text-3xl font-bold text-emerald-500">{engagementStats.upcomingCount}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <p className="text-sm uppercase tracking-wide text-slate-500">Previous Highlights</p>
            <p className="text-3xl font-bold text-sluBlue">{engagementStats.pastCount}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <p className="text-sm uppercase tracking-wide text-slate-500">Locations Represented</p>
            <p className="text-3xl font-bold text-sluBlue">{engagementStats.uniqueLocations}</p>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="calendar" className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-sluBlue">Upcoming Events Calendar</h2>
          <span className="text-sm text-slate-500">
            Data pulled from the SLU DataNexus event hub (2020 - 2025)
          </span>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-600 space-y-8 shadow-sm">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-sluBlue">We’re planning the next lineup</h3>
              <p className="max-w-3xl mx-auto text-slate-500">
                No sessions are scheduled yet, but recent engagement data highlights where alumni and
                employers want to connect next. Use these insights to shape the upcoming season.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {eventTypeInsights.length === 0 ? (
                <div className="col-span-full text-center text-slate-400">
                  Add a new event to the calendar to start building recommendations.
                </div>
              ) : (
                eventTypeInsights.map((insight) => (
                  <article
                    key={insight.type}
                    className="border border-slate-200 rounded-xl p-6 bg-slate-50 shadow-sm hover:shadow-md transition"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
                      {insight.count} recent sessions
                    </p>
                    <h4 className="text-lg font-semibold text-sluBlue">{insight.type}</h4>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      Last hosted on {formatDate(insight.latestDate)} with {insight.organizer}. Alumni
                      interest remains strong—{insight.city} leads participation.
                    </p>
                  </article>
                ))
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#connect"
                className="inline-flex items-center gap-2 rounded-full bg-sluBlue text-white px-5 py-3 text-sm font-semibold shadow hover:bg-sluBlue/90 transition"
              >
                Propose a New Event
              </a>
              <a
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-sluBlue px-5 py-3 text-sm font-semibold text-sluBlue hover:bg-sluBlue/10 transition"
              >
                Update Event Data
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-6">
            {Object.entries(monthBuckets).map(([month, events]) => (
              <div key={month} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-sluGold rounded-full" />
                  <h3 className="text-xl font-semibold text-sluBlue">{month}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((event, idx) => (
                    <article
                      key={`${event.event_key}-${idx}`}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-white transition"
                    >
                      <p className="text-sm text-slate-500 uppercase tracking-wide">
                        {formatDate(event.start_date)} · {event.event_type}
                      </p>
                      <h4 className="text-lg font-semibold text-sluBlue mt-1">{event.event_name}</h4>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-3">
                        Hosted by {event.organizer_name} · {event.city || event.venue || 'Virtual'}
                      </p>
                      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <span>Capacity: {event.capacity || 'TBD'}</span>
                        <span>{event.department_host || 'SLU DataNexus'}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Connect Form */}
      <section id="connect" className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-sluBlue mb-4">
              Partner with DataNexus Events
            </h2>
            <p className="text-slate-600 text-lg">
              Interested in hosting a session, showcasing an employer partnership, or mentoring SLU talent?
              Complete the form and our events team will co-create an unforgettable experience with you.
            </p>
            <ul className="mt-6 space-y-3 text-slate-600">
              <li>• Mentorship Labs & Leadership Circles</li>
              <li>• Innovation Showcases & Career Summits</li>
              <li>• Virtual engagement and alumni spotlights</li>
            </ul>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-lg p-6">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setFormFeedback(null);
                try {
                  const payload = {
                    ...formState,
                    applicationsSubmitted: Number(formState.applicationsSubmitted || 0),
                  };
                  const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.error || 'Unable to submit inquiry.');
                  }
                  setFormFeedback({
                    type: 'success',
                    message:
                      'Thanks! Your request has been received. Our events team will contact you soon.',
                  });
                  setFormState({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    audienceType: 'employer',
                    companyName: '',
                    studentId: '',
                    currentCompany: '',
                    relationshipInterest: true,
                    applicationsSubmitted: '',
                    upcomingEventId: '',
                    notes: '',
                  });
                } catch (error) {
                  setFormFeedback({
                    type: 'error',
                    message: error.message || 'Something went wrong. Please try again.',
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.firstName}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                    placeholder="Alex"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.lastName}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                    placeholder="Morgan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                    placeholder="alex.morgan@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                    placeholder="+1 (314) 555-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  I am a(n)
                </label>
                <div className="flex flex-wrap gap-3">
                  {['employer', 'alumni', 'partner'].map((type) => (
                    <label
                      key={type}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                        formState.audienceType === type
                          ? 'border-sluBlue bg-sluBlue/10 text-sluBlue'
                          : 'border-slate-300 text-slate-600 hover:border-sluBlue/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="audienceType"
                        value={type}
                        checked={formState.audienceType === type}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, audienceType: e.target.value }))
                        }
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formState.audienceType === 'employer' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.companyName}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                    placeholder="Acme Corp"
                  />
                </div>
              )}

              {formState.audienceType === 'alumni' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">
                      SLU Student ID
                    </label>
                    <input
                      type="text"
                      value={formState.studentId}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, studentId: e.target.value }))
                      }
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                      placeholder="SLU001234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">
                      Current Company
                    </label>
                    <input
                      type="text"
                      value={formState.currentCompany}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, currentCompany: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                      placeholder="Current employer"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Applications Submitted
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.applicationsSubmitted}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, applicationsSubmitted: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">
                    Upcoming Event (interest)
                  </label>
                  <select
                    value={formState.upcomingEventId}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, upcomingEventId: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                  >
                    <option value="">Select an event</option>
                    {upcoming.map((event) => (
                      <option key={event.event_key} value={event.event_key}>
                        {event.event_name} ({formatDate(event.start_date)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  checked={formState.relationshipInterest}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      relationshipInterest: e.target.checked,
                    }))
                  }
                  id="relationshipInterest"
                />
                <label htmlFor="relationshipInterest" className="text-sm text-slate-600">
                  I want to explore deeper partnerships and relationship building with SLU DataNexus.
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Message</label>
                <textarea
                  rows="4"
                  value={formState.notes}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sluBlue/60"
                  placeholder="Share partnership ideas, preferred dates, or other context."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sluBlue text-white py-3 rounded-lg font-semibold hover:bg-sluBlue/90 transition disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit Inquiry'}
              </button>
              {formFeedback && (
                <p
                  className={`text-sm text-center ${
                    formFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formFeedback.message}
                </p>
              )}
              <p className="text-xs text-slate-500 text-center">
                By submitting this form you consent to be contacted about SLU DataNexus events.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Previous Events */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-sluBlue">Previous Highlights</h2>
          <span className="text-sm text-slate-500">Curated from SLU DataNexus archives</span>
        </div>
        {past.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            Previous event highlights will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {past.map((event, idx) => (
              <article
                key={`past-${event.event_key}-${idx}`}
                className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-xl transition"
              >
                <div
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url('${event.heroImage}')` }}
                />
                <div className="p-6 space-y-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {formatDate(event.start_date)} • {event.city || 'St. Louis'}
                  </p>
                  <h3 className="text-lg font-semibold text-sluBlue">{event.event_name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3">
                    {event.theme ? `${event.theme} · ` : ''}Organized by {event.organizer_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Attendees: {event.capacity || '150+'}</span>
                    <span>·</span>
                    <span>{event.department_host || 'SLU DataNexus'}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Events;

