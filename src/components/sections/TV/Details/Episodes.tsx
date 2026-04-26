import { tmdb } from "@/api/tmdb";
import useBreakpoints from "@/hooks/useBreakpoints";
import { cn, formatDate, isEmpty } from "@/utils/helpers";
import { PlayOutline } from "@/utils/icons";
import { getImageUrl, getLoadingLabel, movieDurationString } from "@/utils/movies";
import { Card, CardBody, CardFooter, Chip, Image, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { memo } from "react";

interface TvShowEpisodesSelectionProps {
  id: number;
  seasonNumber?: number;
  groupId?: string;
  mode: "season" | "group";
  filters?: {
    searchQuery?: string;
    sortedByName?: boolean;
    layout?: "list" | "grid";
  };
}

interface EpisodeCardProps {
  id: number;
  episode: any;           // TMDB episode shape
  order?: number;
  withAnimation?: boolean;
}

const TvShowEpisodesSelection: React.FC<TvShowEpisodesSelectionProps> = ({
  id,
  seasonNumber,
  groupId,
  mode,
  filters: { searchQuery, sortedByName, layout } = {},
}) => {
  const { data, isPending } = useQuery({
    queryKey: ["tv-show-episodes", id, mode, seasonNumber, groupId],
    queryFn: async () => {
      if (mode === "group" && groupId) {
        const group = await tmdb.tvShows.episodeGroup(groupId);
        // Flatten all groups into one episode list (this is the key for anime)
        return group.groups.flatMap((g: any) => g.episodes || []);
      }
      const season = await tmdb.tvShows.season(id, seasonNumber!);
      return season.episodes || [];
    },
  });

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner variant="wave" size="lg" label={getLoadingLabel()} color="warning" />
      </div>
    );
  }

  if (!data || isEmpty(data)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center">No episodes found.</p>
      </div>
    );
  }

  const EPISODES = data
    .filter((episode: any) =>
      searchQuery ? episode.name?.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a: any, b: any) =>
      sortedByName ? a.name.localeCompare(b.name) : (a.episode_number || 0) - (b.episode_number || 0)
    );

  if (isEmpty(EPISODES)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-center">No episodes found.</p>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {EPISODES.map((episode: any, index: number) => (
          <EpisodeGridCard key={episode.id} episode={episode} id={id} order={index + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:gap-4">
      {EPISODES.map((episode: any, index: number) => (
        <EpisodeListCard key={episode.id} episode={episode} order={index + 1} id={id} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Keep this exported — your Player page imports it
// ─────────────────────────────────────────────────────────────
export const EpisodeListCard: React.FC<EpisodeCardProps> = ({
  episode,
  order = 1,
  id,
  withAnimation = true,
}) => {
  const imageUrl = getImageUrl(episode.still_path);
  const { mobile } = useBreakpoints();
  const isNotReleased = !episode.air_date || new Date(episode.air_date) > new Date();

  const href = !isNotReleased
    ? `/tv/${id}/${episode.season_number || 1}/${episode.episode_number || order}/player`
    : undefined;

  const isOdd = order % 2 !== 0;

  return (
    <Card
      isPressable={!isNotReleased}
      as={(isNotReleased ? "div" : Link) as any}
      href={href}
      shadow="none"
      className={cn(
        "group motion-preset-blur-right border-foreground-200 bg-foreground-100 motion-duration-300 grid grid-cols-[auto_1fr] gap-3 border-2 transition-colors",
        {
          "hover:border-warning hover:bg-foreground-200": !isNotReleased,
          "cursor-not-allowed opacity-50": isNotReleased,
          "motion-preset-slide-left": isOdd && withAnimation,
          "motion-preset-slide-right": !isOdd && withAnimation,
        }
      )}
    >
      {/* ... your original EpisodeListCard JSX ... */}
      {/* (I kept it exactly as you had it before to avoid breaking styling) */}
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
          {episode.episode_number || order}
        </Chip>
      </div>

      <CardBody className="flex space-y-1">
        <p
          title={episode.name}
          className={cn("line-clamp-1 text-xl font-semibold transition-colors", !isNotReleased && "group-hover:text-warning")}
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
    ? `/tv/${id}/${episode.season_number || 1}/${episode.episode_number || 1}/player`
    : undefined;

  return (
    <Card
      isPressable={!isNotReleased}
      as={(isNotReleased ? "div" : Link) as any}
      href={href}
      shadow="none"
      className={cn("group motion-preset-focus border-foreground-200 bg-foreground-100 border-2 transition-colors", {
        "hover:border-warning hover:bg-foreground-200": !isNotReleased,
        "cursor-not-allowed opacity-50": isNotReleased,
      })}
    >
      {/* Your original grid card JSX — kept intact */}
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
          <p title={episode.name} className={cn("text-lg font-semibold transition-colors", !isNotReleased && "group-hover:text-warning")}>
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
