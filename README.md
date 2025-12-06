# Gabriola Connect - Read Me needs to be updated.

A responsive community web app for Gabriola Island featuring event calendars, bulletin board, business directory, and ferry status updates.

## Features

### 📅 Calendar (In Progress)
- Opens on December 1st, 2025
- 546+ events from gabriolaevents.ca, artsgabriola, hellogabriola, and soundernews
- Click any day to view all events
- Event cards with title, time, location, poster images, descriptions
- RSVP functionality
- Auto-refreshes every hour

### 💬 BBS/Forum (Bulletin Board System)
- Open Community forum
- Post anonymously or with your name
- Threaded replies up to 3 levels deep ?
- Categories: General, Health, Politics-US, Politics-Canada, Ferry, Events Chat 
- Image upload with AI content moderation (flags nudity for human review)
- Search and filter by category
- Optional news link attachments

### 📖 Directory
- Island business listings (cafes, mechanics, yoga studios, etc.)
- Scraped from Gabriola directory sites
- Click to view on map with location details
- "Add Business" form - instant submission, no vetting?
- Filter by category
- Contact info and descriptions

### ⚓ Ferry Status
- Live BC Ferries Nanaimo-Gabriola route data
- Next departure and arrival times
- Delay status (on time or minutes late)
- Last known ferry location
- "Get Latest" button for manual refresh
- Auto-updates every 2 minutes

### 🚨 Emergency Alert System
- Restricted to authorized issuers:
  - Fire Department
  - RCMP
  - Gabriola Chamber of Commerce
  - Island Health
  - Ambulance Service
- Red triangle badge in top-right corner when active
- Full-screen alert modal with auto-dismiss (30 seconds)
- One-tap manual dismissal

## Design

- **Theme**: Gabriola green (#2D5F3F) with sand and ocean accents
- **Responsive**: Perfect on mobile and desktop
- **Typography**: Georgia serif for headers, system sans-serif for body
- **Bottom Navigation**: Large, thumb-safe tap targets
- **Icons**: Calendar square, chat bubble, book, anchor

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Calendar**: react-big-calendar
- **Icons**: lucide-react
- **TypeScript**: Full type safety
- **Deployment**: Vercel-ready

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
gabriola-connect/
├── app/
│   ├── globals.css          # Global styles with Gabriola theme
│   ├── layout.tsx            # Root layout with metadata
│   └── page.tsx              # Main app with tab navigation
├── components/
│   ├── Calendar.tsx          # Event calendar with modal
│   ├── BBS.tsx               # Bulletin board with threading
│   ├── Directory.tsx         # Business directory with map
│   ├── Ferry.tsx             # Ferry status display
│   └── EmergencyAlert.tsx    # Full-screen alert modal
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   └── data.ts               # Mock data and utilities
├── public/                   # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js        # Gabriola color theme
└── next.config.js
```

## Data Sources (Production Implementation)

### Events Scraper
Scrape from:
- gabriolaevents.ca
- artsgabriola.com
- hellogabriola.com
- soundernews.com

Run daily via cron job or Vercel serverless function.

### Ferry API
Integrate with BC Ferries API:
- Endpoint: `https://www.bcferries.com/api/...`
- Route: Nanaimo (Departure Bay) to Gabriola
- Update every 2 minutes

### BBS Storage
Use Vercel Postgres or similar:
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  title VARCHAR(255),
  message TEXT,
  category VARCHAR(50),
  news_link TEXT,
  image_url TEXT,
  image_status VARCHAR(20),
  created_at TIMESTAMP
);

CREATE TABLE replies (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  parent_id UUID REFERENCES replies(id),
  name VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP
);
```

### Directory Storage
Similar Postgres table for business listings with lat/lng coordinates.

### Emergency Alerts
Admin authentication using NextAuth.js:
- Email/password for authorized issuers
- POST endpoint to create alerts
- WebSocket or polling for real-time updates

## Deployment to Vercel

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Import Project"
- Select your GitHub repository
- Deploy!

3. **Environment Variables**
Add in Vercel dashboard:
```
POSTGRES_URL=your_database_url
FERRY_API_KEY=your_bc_ferries_key
OPENAI_API_KEY=for_image_moderation
```

## Future Enhancements

- [ ] Real-time BBS updates with WebSockets
- [ ] Push notifications for emergency alerts
- [ ] User profiles and RSVP tracking
- [ ] Event organizer dashboard
- [ ] Ferry schedule integration
- [ ] Weather widget
- [ ] Tide tables
- [ ] Community marketplace
- [ ] Restaurant menus
- [ ] Trail maps

## License

Free!

## Contact

Built for the Gabriola Island community. Questions or feedback? Post on the Forum!
