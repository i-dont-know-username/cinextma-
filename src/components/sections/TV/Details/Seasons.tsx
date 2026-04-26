import { forwardRef, memo, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Select,
  SelectItem,
  Input,
  ScrollShadow,
  Tabs,
  Tab,
  Tooltip,
} from "@heroui/react";
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
  const [sortedByName, { toggle, close }] = useDisclosure(false);
  const [search, setSearch] = useState("");
  const [searchQuery] = useDebouncedValue(search, 300);
  const [layout, setLayout] = useState<"list" | "grid">("list");

  // Fetch episode groups (this is what fixes anime seasons)
  const { data: groupsData } = useQuery({
    queryKey: ["tv-episode-groups", id],
    queryFn: () => tmdb.tvShows.episodeGroups(id),
  });

  const GROUPS = groupsData?.results || [];
  const hasGroups = GROUPS.length > 0;

  const dropdownItems = useMemo(() => {
    if (hasGroups) {
      return GROUPS.map((g: any) => ({
        key: `group-${g.id}`,
        label: g.name || `Group ${g.id}`,
        type: "group" as const,
        groupId: g.id,
      }));
    }

    // Fallback to normal seasons
    return seasons
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        key: `season-${s.season_number}`,
        label: s.name,
        type: "season" as const,
        seasonNumber: s.season_number,
      }));
  }, [GROUPS, seasons, hasGroups]);

  const [selectedKey, setSelectedKey] = useState(() => dropdownItems[0]?.key || "");

  const selectedItem = dropdownItems.find((item) => item.key === selectedKey);

  return (
    <section ref={ref} id="seasons-episodes" className="z-3 flex flex-col gap-2">
      <SectionTitle color="warning">Season & Episode</SectionTitle>

      <Card className="sm:p-3">
        <CardHeader className="grid grid-cols-1 grid-rows-[1fr_auto] gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <Select
            aria-label="Seasons"
            selectedKeys={[selectedKey]}
            disallowEmptySelection
            classNames={{ trigger: "border-2 border-foreground-200" }}
            onChange={(e) => {
              close();
              setSearch("");
              setSelectedKey(e.target.value);
            }}
          >
            {dropdownItems.map((item) => (
              <SelectItem key={item.key}>{item.label}</SelectItem>
            ))}
          </Select>

          <Input
            isClearable
            aria-label="Search Episodes"
            placeholder="Search episodes..."
            value={search}
            onValueChange={setSearch}
            startContent={<Search />}
            classNames={{ inputWrapper: "border-2 border-foreground-200" }}
          />

          <Tooltip content={titleCase(layout)}>
            <Tabs
              color="warning"
              aria-label="Layout Select"
              size="sm"
              classNames={{ tabList: "border-2 border-foreground-200" }}
              selectedKey={layout}
              onSelectionChange={(value) => setLayout(value as "list" | "grid")}
            >
              <Tab key="list" title={<List />} />
              <Tab key="grid" title={<Grid />} />
            </Tabs>
          </Tooltip>

          <IconButton
            tooltip="Sort by name"
            className="p-2"
            icon={<SortAlpha />}
            onPress={toggle}
            color={sortedByName ? "warning" : undefined}
            variant={sortedByName ? "shadow" : "faded"}
          />
        </CardHeader>

        <CardBody>
          <ScrollShadow className="h-[600px] py-2 pr-2 sm:pr-3">
            {selectedItem && (
              <TvShowEpisodesSelection
                id={id}
                mode={selectedItem.type}
                seasonNumber={selectedItem.seasonNumber}
                groupId={selectedItem.groupId}
                filters={{ searchQuery, sortedByName, layout }}
              />
            )}
          </ScrollShadow>
        </CardBody>
      </Card>
    </section>
  );
});

TvShowsSeasonsSelection.displayName = "TvShowsSeasonsSelection";
export default memo(TvShowsSeasonsSelection);
