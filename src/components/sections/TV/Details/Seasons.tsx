import { forwardRef, memo, useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Select, SelectItem, Input, ScrollShadow, Tabs, Tab, Tooltip, Spinner } from "@heroui/react";
import { Season } from "tmdb-ts";
import { Grid, List, Search, SortAlpha } from "@/utils/icons";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import dynamic from "next/dynamic";
import IconButton from "@/components/ui/button/IconButton";
import SectionTitle from "@/components/ui/other/SectionTitle";
import { titleCase } from "string-ts";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/api/tmdb";

const TvShowEpisodesSelection = dynamic(() => import("./Episodes"));

interface Props {
  id: number;
  seasons: Season[];
}

const TvShowsSeasonsSelection = forwardRef<HTMLElement, Props>(({ id, seasons }, ref) => {
  // 1. Fetch available episode groups
  const { data: groupList, isLoading: loadingGroups } = useQuery({
    queryKey: ["tv-episode-groups", id],
    queryFn: () => fetch(`https://api.themoviedb.org/3/tv/${id}/episode_groups?api_key=a2f888b27315e62e471b2d587048f32e`).then(res => res.json()),
  });

  // 2. Fetch the specific details for the "Original Air Date" or "TV" group
  const preferredGroupId = useMemo(() => {
    if (!groupList?.results) return null;
    // We look for "Original Air Date" or "Digital" or "TV" order
    const group = groupList.results.find((g: any) => g.type === 1 || g.name.toLowerCase().includes("season") || g.name.toLowerCase().includes("air date"));
    return group?.id || groupList.results[0]?.id;
  }, [groupList]);

  const { data: groupDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["episode-group-details", preferredGroupId],
    queryFn: () => fetch(`https://api.themoviedb.org/3/episode_group/${preferredGroupId}?api_key=a2f888b27315e62e471b2d587048f32e`).then(res => res.json()),
    enabled: !!preferredGroupId,
  });

  // 3. Format the groups into "Seasons"
  const DISPLAY_SEASONS = useMemo(() => {
    if (groupDetails?.groups) {
      return groupDetails.groups.map((group: any, index: number) => ({
        uniqueKey: group.id,
        name: `Season ${index + 1}`, // Always use "Season X"
        episodes: group.episodes,
        isGroup: true
      }));
    }
    // Fallback to regular seasons if no groups found
    return seasons.filter(s => s.season_number > 0).map(s => ({
      uniqueKey: s.id.toString(),
      name: s.name || `Season ${s.season_number}`,
      season_number: s.season_number,
      isGroup: false
    }));
  }, [groupDetails, seasons]);

  const [sortedByName, { toggle, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const [searchQuery] = useDebouncedValue(search, 300);
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [selectedKey, setSelectedKey] = useState("");

  useEffect(() => {
    if (DISPLAY_SEASONS.length > 0 && !selectedKey) {
      setSelectedKey(DISPLAY_SEASONS[0].uniqueKey);
    }
  }, [DISPLAY_SEASONS, selectedKey]);

  const activeSeason = useMemo(() => {
    return DISPLAY_SEASONS.find((s) => s.uniqueKey === selectedKey) || DISPLAY_SEASONS[0];
  }, [selectedKey, DISPLAY_SEASONS]);

  if (loadingGroups || loadingDetails) return <Spinner color="warning" />;

  return (
    <section ref={ref} id="seasons-episodes" className="z-3 flex flex-col gap-2">
      <SectionTitle color="warning">Season & Episode</SectionTitle>
      <Card className="sm:p-3">
        <CardHeader className="grid grid-cols-1 grid-rows-[1fr_auto] gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <Select
            aria-label="Seasons"
            selectedKeys={selectedKey ? [selectedKey] : []}
            disallowEmptySelection
            onChange={(e) => { setSelectedKey(e.target.value); setSearch(""); }}
          >
            {DISPLAY_SEASONS.map((s) => (
              <SelectItem key={s.uniqueKey}>{s.name}</SelectItem>
            ))}
          </Select>
          <Input placeholder="Search episodes..." value={search} onValueChange={setSearch} startContent={<Search />} />
          <Tabs color="warning" size="sm" onSelectionChange={(v) => setLayout(v as any)} selectedKey={layout}>
            <Tab key="list" title={<List />} />
            <Tab key="grid" title={<Grid />} />
          </Tabs>
          <IconButton icon={<SortAlpha />} onPress={toggle} color={sortedByName ? "warning" : undefined} />
        </CardHeader>
        <CardBody>
          <ScrollShadow className="h-[600px] py-2">
            <TvShowEpisodesSelection
              id={id}
              // If it's a group, we pass the episodes directly to avoid another API call
              groupEpisodes={activeSeason?.isGroup ? activeSeason.episodes : null}
              seasonNumber={activeSeason?.season_number}
              virtualSeasonNumber={DISPLAY_SEASONS.indexOf(activeSeason) + 1}
              filters={{ searchQuery, sortedByName, layout }}
            />
          </ScrollShadow>
        </CardBody>
      </Card>
    </section>
  );
});

TvShowsSeasonsSelection.displayName = "TvShowsSeasonsSelection";
export default memo(TvShowsSeasonsSelection);
