import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { idInput, showtimesInput } from "@/lib/schemas";
import {
  fetchActiveOffers,
  fetchCities,
  fetchFoodItems,
  fetchMovie,
  fetchMovieCast,
  fetchMovieReviews,
  fetchMovies,
  fetchSeatMap,
  fetchShowtimes,
  fetchSimilarMovies,
} from "@/lib/movies.server";

export const listMovies = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        status: z.enum(["now_showing", "upcoming"]).default("now_showing"),
        search: z.string().max(100).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(({ data }) => fetchMovies(data.status, data.search));

export const getMovie = createServerFn({ method: "GET" })
  .inputValidator((data) => idInput.parse(data))
  .handler(({ data }) => fetchMovie(data.id));

export const listShowtimes = createServerFn({ method: "GET" })
  .inputValidator((data) => showtimesInput.parse(data))
  .handler(({ data }) => fetchShowtimes(data.movieId, data.date, data.city));

export const getSeatMap = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ showId: z.string().uuid() }).parse(data))
  .handler(({ data }) => fetchSeatMap(data.showId));

export const listFoodItems = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ includeUnavailable: z.boolean().default(false) }).parse(data ?? {}),
  )
  .handler(({ data }) => fetchFoodItems(data.includeUnavailable));

export const listCities = createServerFn({ method: "GET" }).handler(() => fetchCities());

export const getMovieCast = createServerFn({ method: "GET" })
  .inputValidator((data) => idInput.parse(data))
  .handler(({ data }) => fetchMovieCast(data.id));

export const getMovieReviews = createServerFn({ method: "GET" })
  .inputValidator((data) => idInput.parse(data))
  .handler(({ data }) => fetchMovieReviews(data.id));

export const listOffers = createServerFn({ method: "GET" }).handler(() => fetchActiveOffers());

export const getSimilarMovies = createServerFn({ method: "GET" })
  .inputValidator((data) => idInput.parse(data))
  .handler(({ data }) => fetchSimilarMovies(data.id));
