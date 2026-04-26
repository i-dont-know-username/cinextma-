import { tmdb } from "@/api/tmdb";
import { cn, formatDate, isEmpty } from "@/utils/helpers";
import { PlayOutline } from "@/utils/icons";
import { getImageUrl, movieDurationString } from "@/utils/movies";
import { Card, CardBody, CardFooter, Chip, Image, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { memo } from "react";

interface Props {
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

const TvShowEpisodesSelection: React.FC<Props> = ({
  id,
  seasonNumber,
  groupId,
  mode,
  filters: { searchQuery, sortedByName, layout } = {},
}) => {
  const { data, isPending } = useQuery({
    queryKey: ["episodes", id, seasonNumber, groupId],
    queryFn: async () => {
      if (mode === "group" && groupId) {
        const group = await tmdb.tvShows.episodeGroup(groupId);

        // 🔥 Flatten groups → episodes
        return group.groups.flatMap((g: any) => g.episodes);
      }

      const season = await tmdb.tvShows.season(id, seasonNumber!);
      return season.episodes;
    },
  });

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner variant="wave" size="lg" />
      </div>
    );
  }

  if (!data) return null;

  const EPISODES = data
    .filter((ep: any) =>
      searchQuery
        ? ep.name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true,
    )
    .sort((a: any, b: any) =>
      sortedByName ? a.name.localeCompare(b.name) : a.episode_number - b.episode_number,
    );

  if (isEmpty(EPISODES)) {
    return <p className="text-center">No episodes found.</p>;
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        layout === "grid"
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1",
      )}
    >
      {EPISODES.map((ep: any, i: number) => {
        const isNotReleased =
          !ep.air_date || new Date(ep.air_date) > new Date();

        const href = !isNotReleased
          ? `/tv/${id}/${ep.season_number || 1}/${i + 1}/player`
          : undefined;

        return (
          <Card
            key={ep.id}
            isPressable={!isNotReleased}
            as={(isNotReleased ? "div" : Link) as any}
            href={href}
            className={cn("border-2", {
              "opacity-50 cursor-not-allowed": isNotReleased,
            })}
          >
            <CardBody className="p-0">
              <div className="relative">
                <Image
                  src={getImageUrl(ep.still_path)}
                  alt={ep.name}
                  className="aspect-video w-full object-cover"
                />

                <Chip className="absolute top-2 right-2">
                  {isNotReleased
                    ? "Coming Soon"
                    : movieDurationString(ep.runtime)}
                </Chip>

                <Chip className="absolute bottom-2 left-2">
                  {i + 1}
                </Chip>
              </div>
            </CardBody>

            <CardFooter className="flex flex-col items-start">
              <p className="font-semibold">{ep.name}</p>
              <p className="text-xs text-gray-400">
                {formatDate(ep.air_date, "en-US")}
              </p>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default memo(TvShowEpisodesSelection);
