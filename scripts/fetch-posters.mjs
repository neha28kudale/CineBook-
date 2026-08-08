// Fetches real movie posters from TMDB (The Movie Database) — free, legal,
// built exactly for this purpose — and writes them into your Supabase
// `movies` table via the admin/service-role client.
//
// Setup:
//   1. Get a free API key: https://www.themoviedb.org/settings/api
//      (sign up -> Settings -> API -> Request an API key -> "Developer")
//   2. Add to .env:  TMDB_API_KEY="your-key-here"
//   3. Run:  node scripts/fetch-posters.mjs
//
// Safe to re-run — it only updates rows, never creates/deletes movies.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your .env");
  process.exit(1);
}
if (!TMDB_API_KEY) {
  console.error("Missing TMDB_API_KEY in your .env — get a free one at https://www.themoviedb.org/settings/api");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Map our app's language names to TMDB's ISO 639-1 codes, to bias search
// results toward the right film when titles are shared across industries.
const LANG_TO_TMDB = {
  English: "en",
  Hindi: "hi",
  Tamil: "ta",
  Telugu: "te",
  Korean: "ko",
  Japanese: "ja",
};

async function searchTmdbPoster(title, language) {
  const langCode = LANG_TO_TMDB[language];
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("query", title);
  if (langCode) url.searchParams.set("region", langCode === "en" ? "US" : "IN");

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  TMDB request failed for "${title}": ${res.status}`);
    return null;
  }
  const json = await res.json();
  const results = json.results ?? [];
  if (!results.length) return null;

  // Prefer a result whose original_language matches, otherwise take the top hit.
  const best =
    (langCode && results.find((r) => r.original_language === langCode)) || results[0];

  if (!best?.poster_path) return null;
  return `https://image.tmdb.org/t/p/w500${best.poster_path}`;
}

async function main() {
  const { data: movies, error } = await supabase
    .from("movies")
    .select("id, title, language, poster_url");

  if (error) {
    console.error("Failed to load movies:", error.message);
    process.exit(1);
  }

  console.log(`Found ${movies.length} movies. Fetching posters from TMDB...\n`);

  let updated = 0;
  let skipped = 0;

  for (const movie of movies) {
    process.stdout.write(`  ${movie.title} (${movie.language})... `);
    try {
      const posterUrl = await searchTmdbPoster(movie.title, movie.language);
      if (!posterUrl) {
        console.log("no match found, left as-is");
        skipped++;
        continue;
      }
      const { error: updateError } = await supabase
        .from("movies")
        .update({ poster_url: posterUrl })
        .eq("id", movie.id);
      if (updateError) {
        console.log(`update failed: ${updateError.message}`);
        skipped++;
        continue;
      }
      console.log("done");
      updated++;
    } catch (err) {
      console.log(`error: ${err.message}`);
      skipped++;
    }
    // Be polite to TMDB's rate limit
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\nDone. Updated ${updated} posters, skipped ${skipped}.`);
}

main();
