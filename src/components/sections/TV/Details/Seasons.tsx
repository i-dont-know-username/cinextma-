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

const TvShowEpisodesSelection = dynamic(() => import("./Episodes"));

interface Props {
  id: number;
  seasons: Season[];
}

const TvShowsSeasonsSelection = forwardRef<HTMLElement, Props>(
  ({ id, seasons }, ref) => {
    
    const DISPLAY_SEASONS = useMemo(() => {
      const result: { 
        uniqueKey: string; 
        tmdbSeasonNumber: number; 
        virtualSeasonNumber: number; 
        name: string; 
        range?: [number, number] 
      }[] = [];
      
      let currentVirtualSeason = 1;

      seasons.forEach((season) => {
        if (season.season_number <= 0) return;

        // If it's a huge merged season (like JJK Season 1 with 59 eps)
        if (season.episode_count > 25) {
          const itemsPerPage = 24;
          const totalParts = Math.ceil(season.episode_count / itemsPerPage);

          for (let i = 0; i < totalParts; i++) {
            const start = i * itemsPerPage + 1;
            const end = Math.min((i + 1) * itemsPerPage, season.episode_count);
            
            result.push({
              uniqueKey: `${season.id}-part-${i}`,
              tmdbSeasonNumber: season.season_number,
              virtualSeasonNumber: currentVirtualSeason,
              name: `Season ${currentVirtualSeason}`, // Overrides to "Season X"
              range: [start, end]
            });
            currentVirtualSeason++;
          }
        } else {
          // Standard season behavior
          result.push({
            uniqueKey: season.id.toString(),
            tmdbSeasonNumber: season.season_number,
            virtualSeasonNumber: currentVirtualSeason,
            name: season.name && !season.name.toLowerCase().includes("season") 
                  ? season.name 
                  : `Season ${currentVirtualSeason}`,
          });
          currentVirtualSeason++;
        }
      });

      return result;
    }, [seasons]);

    const [sortedByName, { toggle, close }] = useDisclosure(false);
    const [search, setSearch] = useState("");
    const [searchQuery] = useDebouncedValue(search, 300);
    const [layout, setLayout] = useState<"list" | "grid">("list");

    const [selectedKey, setSelectedKey] = useState(() =>
      DISPLAY_SEASONS[0]?.uniqueKey ?? ""
    );

    const activeSeason = useMemo(() => {
      return DISPLAY_SEASONS.find((s) => s.uniqueKey === selectedKey) || DISPLAY_SEASONS[0];
    }, [selectedKey, DISPLAY_SEASONS]);

    return (
      <section ref={ref} id="seasons-episodes" className="z-3 flex flex-col gap-2">
        <SectionTitle color="warning">Season & Episode</SectionTitle>

        <Card className="sm:p-3">
          <CardHeader className="grid grid-cols-1 grid-rows-[1fr_auto] gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
            <Select
              aria-label="Seasons"
              selectedKeys={selectedKey ? [selectedKey] : []}
              disallowEmptySelection
              classNames={{ trigger: "border-2 border-foreground-200" }}
              onChange={(e) => {
                close();
                setSearch("");
                setSelectedKey(e.target.value);
              }}
            >
              {DISPLAY_SEASONS.map(({ uniqueKey, name }) => (
                <SelectItem key={uniqueKey}>
                  {name}
                </SelectItem>
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
                onSelectionChange={(value) =>
                  setLayout(value as typeof layout)
                }
                selectedKey={layout}
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
              <TvShowEpisodesSelection
                id={id}
                tmdbSeasonNumber={activeSeason?.tmdbSeasonNumber ?? 1}
                virtualSeasonNumber={activeSeason?.virtualSeasonNumber ?? 1}
                virtualRange={activeSeason?.range}
                filters={{ searchQuery, sortedByName, layout }}
              />
            </ScrollShadow>
          </CardBody>
        </Card>
      </section>
    );
  },
);

TvShowsSeasonsSelection.displayName = "TvShowsSeasonsSelection";

export default memo(TvShowsSeasonsSelection);
