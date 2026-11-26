# Ginikachi & Godwin · Wedding invitation draft

Tap the satin bow to part the ribbon and swing open the illustrated invitation. It includes a countdown, ceremony schedule, dress code, accommodation searches, gifts, FAQs, a note from the couple, a real-photo gallery, RSVP confirmation, their toast, and an area map. Content fades and comes back into focus as guests scroll in either direction.

Run `npm run dev`, then open `http://localhost:3000`. The private response page is available at `/responses` and uses `preview` as its password locally.

For Vercel, import the GitHub repository. Create a **Private Vercel Blob** store connected to the project, then add an `RSVP_ADMIN_PASSWORD` environment variable. Each submission is stored durably as an individual private `.txt` file. The checked-in configuration serves the `public` folder and the RSVP serverless function with no build step.
