# Briefly — AI Article Summarizer

A powerful Chrome extension that generates clear, source-aware summaries of the articles you are reading, right from the browser's side panel. Powered by Google's Gemini AI, Briefly helps you consume content faster with structured takeaways and thoughtful follow-up questions.

## ✨ Features

- **Smart Extraction:** Extracts readable text from the active article while ignoring distracting navigation and footers.
- **Structured Insights:** Produces a concise TL;DR, 3–7 key takeaways, and follow-up questions to explore.
- **Customizable Depth:** Choose between Short, Medium, and Detailed summary lengths.
- **Multilingual Support:** Generate summaries in English or Hindi.
- **Local Library:** Save up to 50 summaries locally in your browser for quick reference.
- **Privacy-First:** Reads the active tab only when you explicitly click "Summarize article".
- **Bring Your Own Key:** Use your personal Gemini API key or connect to a shared Cloudflare Worker backend.

## 🚀 Installation (Developer Mode)

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the `briefly-extension` folder.
4. Pin the Briefly extension to your toolbar.
5. Open any public article and click the Briefly icon to open the side panel.

## ⚙️ Configuration

1. Get a Free Tier Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open Briefly and go to **Settings** (⚙ icon).
3. Select **My Gemini API key** and paste your key.
4. Your key is securely stored in `chrome.storage.local`.

*Alternatively, if a shared backend is deployed, you can switch the service mode to use the Cloudflare Worker URL defined in `config.js`.*

## ⚠️ Limitations & Notes

- Uses `gemini-3.5-flash-lite`. Ensure your Google AI Studio project is on the Free Tier to avoid unexpected charges. Google's Free Tier data terms apply.
- Paywalled pages, PDFs, browser internal pages, and articles rendered in inaccessible iframes may not extract reliably.
- AI outputs can contain hallucinations; always verify critical facts against the original source.
- Shared mode requires proper abuse controls and rate-limiting (via Cloudflare Workers) before wide public release.

## 📁 Files

- `manifest.json` — Chrome permissions and side-panel entry.
- `extract.js` — on-demand article extraction.
- `background.js` — OpenAI request and response validation.
- `panel.html`, `style.css`, `panel.js` — UI and local saves.
- `icons/` — blue Briefly toolbar and store icons.
- `config.js` — shared Worker URL, configured after deployment.
