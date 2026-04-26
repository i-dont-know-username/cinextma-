import { tmdb } from "@/api/tmdb";
import useBreakpoints from "@/hooks/useBreakpoints";
import { cn, formatDate, isEmpty } from "@/utils/helpers";
import { PlayOutline } from "@/utils/icons";
import { getImageUrl, getLoadingLabel, movieDurationString } from "@/utils/movies";
import { Card, CardBody, CardFooter, Chip, Image, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { memo } from "react";
import { Episode } from "tmdb-ts/dist/types/tv-episode";

interface TvShowEpisodesSelectionProps {
  id: number;
  seasonNumber: number;
  filters?: {
    searchQuery?: string;
    sortedByName?: boolean;
    layout?: "list" | "grid";
  };
}

interface EpisodeCardProps {
  id: number;
  episode: Episode;
  order?: number;
  withAnimation?: boolean;
}

const TvShowEpisodesSelection: React.FC<TvShowEpisodesSelectionProps> = ({
  id,
  seasonNumber,
  filters: { searchQuery, sortedByName, layout } = {},
}) => {
  const { data, isPending } = useQuery({
    queryFn: () => tmdb.tvShows.season(id, seasonNumber),
    queryKey: ["tv-show-episodes", id, seasonNumber],
  });

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner variant="wave" size="lg" label={getLoadingLabel()} color="warning" />
      </div>
    );
  }

  if (!data) return null;

  // Step 2: The 3-Month Gap Check
  const sortedDataEpisodes = [...data.episodes].sort((a, b) => a.episode_number - b.episode_number);
  const groupedEpisodes: { part: number; episodes: Episode[] }[] = [];
  
  let currentPart = 1;
  let currentGroup: Episode[] = [];

  for (let i = 0; i < sortedDataEpisodes.length; i++) {
    const ep = sortedDataEpisodes[i];

    if (i > 0) {
      const prevEp = sortedDataEpisodes[i - 1];
      if (ep.air_date && prevEp.air_date) {
        const currentAirDate = new Date(ep.air_date);
        const prevAirDate = new Date(prevEp.air_date);
        const diffDays = (currentAirDate.getTime() - prevAirDate.getTime()) / (1000 * 3600 * 24);

        // If the gap is 90 days (~3 months) or more, we split it into a new Part
        if (diffDays >= 90) {
          groupedEpisodes.push({ part: currentPart, episodes: currentGroup });
          currentPart++;
          currentGroup = [];
        }
      }
    }
    currentGroup.push(ep);
  }
  
  if (currentGroup.length > 0) {
    groupedEpisodes.push({ part: currentPart, episodes: currentGroup });
  }

  // Apply Search and Sorting filters to the groups
  const filteredGroups = groupedEpisodes
    .map((group) => {
      let eps = group.episodes;
      if (searchQuery) {
        eps = eps.filter((ep) => ep.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      if (sortedByName) {
        eps = eps.sort((a, b) => a.name.localeCompare(b.name));
      }
      return { ...group, episodes: eps };
    })
    .filter((group) => group.episodes.length > 0);

  if (isEmpty(filteredGroups)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center">No episodes found.</p>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className="flex flex-col gap-8">
        {filteredGroups.map((group) => (
          <div key={group.part} className="flex flex-col gap-3">
            {groupedEpisodes.length > 1 && (
              <h3 className="text-xl font-bold text-warning">Part {group.part}</h3>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {group.episodes.map((episode) => (
                <EpisodeGridCard key={episode.id} episode={episode} id={id} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {filteredGroups.map((group) => (
        <div key={group.part} className="flex flex-col gap-3">
          {groupedEpisodes.length > 1 && (
            <h3 className="text-xl font-bold text-warning">Part {group.part}</h3>
          )}
          <div className="grid grid-cols-1 gap-2 sm:gap-4">
            {group.episodes.map((episode, index) => (
              <EpisodeListCard key={episode.id} episode={episode} order={index + 1} id={id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const EpisodeListCard: React.FC<EpisodeCardProps> = ({
  episode,
  order = 1,
  id,
  withAnimation = true,
}) => {
  const imageUrl = getImageUrl(episode.still_path);
  const { mobile } = useBreakpoints();
  const isNotReleased = !episode.air_date || new Date(episode.air_date) > new Date();
  const isOdd = order % 2 !== 0;
  const href = !isNotReleased
    ? `/tv/${id}/${episode.season_number}/${episode.episode_number}/player`
    : undefined;

  return (
    <Card
      isPressable={!isNotReleased}
      as={(isNotReleased ? "div" : Link) as "a"}
      href={href}
      shadow="none"
      className={cn(
        "group motion-preset-blur-right border-foreground-200 bg-foreground-100 motion-duration-300 grid grid-cols-[auto_1fr] gap-3 border-2 transition-colors",
        {
          "hover:border-warning hover:bg-foreground-200": !isNotReleased,
          "cursor-not-allowed opacity-50": isNotReleased,
          "motion-preset-slide-left": isOdd && withAnimation,
          "motion-preset-slide-right": !isOdd && withAnimation,
        },
      )}
    >
      <div className="relative">
        <Image
          alt={episode.name}
          src={imageUrl}
          height={120}
          width={mobile ? 180 : 220}
          className="rounded-r-none object-cover"
        />
        {!isNotReleased && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/35 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
              <PlayOutline className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
        <Chip
          size="sm"
          color={isNotReleased ? "warning" : undefined}
          variant={isNotReleased ? "shadow" : undefined}
          className={cn("absolute top-2 right-2 z-20", {
            "bg-black/35 backdrop-blur-xs": !isNotReleased,
          })}
        >
          {isNotReleased ? "Coming Soon" : movieDurationString(episode.runtime)}
        </Chip>
        <Chip
          size="sm"
          className="absolute bottom-2 left-2 z-20 min-w-9 bg-black/35 text-center text-white backdrop-blur-xs"
        >
          {episode.episode_number}
        </Chip>
      </div>
      <CardBody className="flex space-y-1">
        <p
          title={episode.name}
          className={cn(
            "line-clamp-1 text-xl font-semibold transition-colors",
            !isNotReleased && "group-hover:text-warning",
          )}
        >
          {episode.name}
        </p>
        <p className="text-content4-foreground line-clamp-1 text-xs">
          {formatDate(episode.air_date, "en-US")}
        </p>
        <p className="text-foreground-500 line-clamp-2 text-sm" title={episode.overview}>
          {episode.overview}
        </p>
      </CardBody>
    </Card>
  );
};

const EpisodeGridCard: React.FC<EpisodeCardProps> = ({ episode, id }) => {
  const imageUrl = getImageUrl(episode.still_path);
  const isNotReleased = !episode.air_date || new Date(episode.air_date) > new Date();
  const href = !isNotReleased
    ? `/tv/${id}/${episode.season_number}/${episode.episode_number}/player`
    : undefined;

  return (
    <Card
      isPressable={!isNotReleased}
      as={(isNotReleased ? "div" : Link) as "a"}
      href={href}
      shadow="none"
      className={cn(
        "group motion-preset-focus border-foreground-200 bg-foreground-100 border-2 transition-colors",
        {
          "hover:border-warning hover:bg-foreground-200": !isNotReleased,
          "cursor-not-allowed opacity-50": isNotReleased,
        },
      )}
    >
      <CardBody className="overflow-visible p-0">
        <div className="relative">
          <Image
            alt={episode.name}
            src={imageUrl}
            className="aspect-video w-full rounded-b-none object-cover"
          />
          {!isNotReleased && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/35 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                <PlayOutline className="h-6 w-6 text-white" />
              </div>
            </div>
          )}
          <Chip
            size="sm"
            color={isNotReleased ? "warning" : undefined}
            variant={isNotReleased ? "shadow" : undefined}
            className={cn("absolute top-2 right-2 z-20", {
              "bg-black/35 backdrop-blur-xs": !isNotReleased,
            })}
          >
            {isNotReleased ? "Coming Soon" : movieDurationString(episode.runtime)}
          </Chip>
          <Chip
            size="sm"
            className="absolute bottom-2 left-2 z-20 min-w-9 bg-black/35 text-center text-white backdrop-blur-xs"
          >
            {episode.episode_number}
          </Chip>
        </div>
      </CardBody>
      <CardFooter className="h-full">
        <div className="flex h-full flex-col gap-2">
          <p
            title={episode.name}
            className={cn(
              "text-lg font-semibold transition-colors",
              !isNotReleased && "group-hover:text-warning",
            )}
          >
            {episode.name}
          </p>
          <p className="text-content4-foreground line-clamp-1 text-xs">
            {formatDate(episode.air_date, "en-US")}
          </p>
          <p className="text-foreground-500 text-sm" title={episode.overview}>
            {episode.overview}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default memo(TvShowEpisodesSelection);
