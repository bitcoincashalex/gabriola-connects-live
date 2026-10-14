-- ============================================================================
-- Island Map - Version 1.2.0 - 2026-10-13
-- 1.2.0: the AGI Hall (465) and the Gabriola Arts Council (476) are separate venues now.
-- 1.1.0: Gabriola Community Hall is at 2200 South Road and the AGI Hall at 465 South Road
--        (both were listed as 476). Fixes their addresses and pins. Safe to run again.
-- Run in Supabase > SQL Editor (Strachan Family Project = Gabriola Connects).
-- Runs as one unit: if anything fails, nothing changes.
--
-- 1. Adds map positions to event venues, and a "show on map" switch to directory
--    businesses (on by default; owners or admins can turn it off).
-- 2. Saves map positions for the businesses and venues whose street address the
--    BC Address Geocoder (geocoder.api.gov.bc.ca, the province's civic address
--    records) matched to an exact civic number on Gabriola Island, score 90 or more.
--    It only fills in places that don't already have a position.
--    Places with only a PO Box, no number, an approximate match, or an off-island
--    address are left off the map (see the list in the chat).
-- ============================================================================

BEGIN;

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.directory_businesses ADD COLUMN IF NOT EXISTS show_on_map boolean NOT NULL DEFAULT true;

-- Businesses (106)
UPDATE public.directory_businesses SET lat = 49.165741, lng = -123.838301 WHERE id = '590639b9-b292-4145-8264-cb3c83e55f40' AND lat IS NULL;  -- A Dog's Day Canine Massage Therapy | 683 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173212, lng = -123.844889 WHERE id = '21c10c5f-7395-4698-a2c3-161d02baee7e' AND lat IS NULL;  -- Amanda Renneberg - Royal LePage Gabriola | 575 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.170498, lng = -123.803254 WHERE id = 'c739f55d-6899-40a0-9e07-0d1e2a2bbd3f' AND lat IS NULL;  -- AngelStar Farm | 1320 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.149984, lng = -123.786153 WHERE id = 'd2277ae7-573c-42bc-85d9-c625a740e41c' AND lat IS NULL;  -- Annie's Roof & Gutter Cleaning | 1635 Hess Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173698, lng = -123.850239 WHERE id = 'ddf5fc37-08c0-4d0a-ba7c-bda7e0a16eaf' AND lat IS NULL;  -- Aquality Service LTD | 470 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.172033, lng = -123.856196 WHERE id = '624c9374-fd8d-4e77-9e35-db8a2839350a' AND lat IS NULL;  -- Arbutus Grove B&B | 870 Duthie Ave, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174491, lng = -123.848051 WHERE id = '1e76d620-ed46-4eaa-aef7-f4b7cac9b5d7' AND lat IS NULL;  -- Arbutus Home Building Centre | 785 Ross Way, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174235, lng = -123.848296 WHERE id = '3667724d-e52b-4965-b169-6fb3d8c20180' AND lat IS NULL;  -- Architrave Design Build Ltd. | 510 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.140361, lng = -123.759395 WHERE id = '1472531d-9189-484d-8735-184ca23c0f1d' AND lat IS NULL;  -- Barrow Downs Excavation | 2085 Bonnie View Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.148007, lng = -123.780672 WHERE id = '77a7c2c3-c27c-40d3-88d1-621e5bb84bdc' AND lat IS NULL;  -- Blackfish Homes Ltd | 1500 Ferne Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.191344, lng = -123.863176 WHERE id = '667c818a-2210-40fd-a5e3-ec8585ddec5c' AND lat IS NULL;  -- Bruno's Kitchen & Catering | 240 Davis Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.169412, lng = -123.863416 WHERE id = 'c5029602-40f2-4f20-b5a1-5b81c06bea62' AND lat IS NULL;  -- Change-Work Coaching and Consulting | 925 Harrison Way, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.190064, lng = -123.842325 WHERE id = '107d4c16-1017-4c39-9e29-ef78916c332a' AND lat IS NULL;  -- Ciao Amore Co. | 381 Tamarack St, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.192763, lng = -123.856652 WHERE id = '5cf8e1b9-7d18-4f31-b3ef-4903f795f9cd' AND lat IS NULL;  -- Clean Slate Home Care | 285 Ricardo Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174237, lng = -123.844348 WHERE id = 'b4b135c5-0fb3-4cd4-9a6c-edf7e53c0e46' AND lat IS NULL;  -- Coastal Community Credit Union | 580 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.171259, lng = -123.828807 WHERE id = '4d73ce78-56da-4519-bf42-39b30afdc16a' AND lat IS NULL;  -- Cosy Fire Pits Ltd. | 865 Tansy Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.155875, lng = -123.718064 WHERE id = 'f96e90fb-f8c5-4f0b-8ef1-fd7d3adb9f3e' AND lat IS NULL;  -- Cresta Roca Farm | 1340 Cresta Roca Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.180247, lng = -123.824343 WHERE id = '738c530a-2661-4184-98cf-592b9870366a' AND lat IS NULL;  -- Dibs Fitness | 940 Horseshoe Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.159467, lng = -123.714585 WHERE id = '5ba9e5ab-dcb6-4532-8129-81e5a2edbf52' AND lat IS NULL;  -- Dragon's Lodge aka Trilink Investments | 2950 Dragon's Lane, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.133323, lng = -123.735494 WHERE id = 'a0f9cb36-3107-41ee-9252-524b68393693' AND lat IS NULL;  -- Drifter Media | 2575 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.149680, lng = -123.779277 WHERE id = 'e68bc7cc-95bd-46d8-90c0-57833f814540' AND lat IS NULL;  -- Ferne Hollow | 1470 Ferne Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.141152, lng = -123.776657 WHERE id = 'c7bd6b45-3782-44fd-8517-013fa69035c4' AND lat IS NULL;  -- Fernehaven Consulting Inc. | 1850 Ferne Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.148325, lng = -123.697214 WHERE id = 'dd2804fd-020c-40d4-aa10-df661c9b054d' AND lat IS NULL;  -- Fisherman's Life Charters | 3350 Coast Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.199954, lng = -123.833926 WHERE id = 'e5ec756d-a429-4590-8f3f-948eeab6baf2' AND lat IS NULL;  -- Frances Usher | 762 Sea Girt Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.132918, lng = -123.767409 WHERE id = '47bcb058-9062-42a2-ad03-b48cf427c2f8' AND lat IS NULL;  -- Free Spirit Sailing | 1956 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174222, lng = -123.867088 WHERE id = '2dd50e9b-19a2-45e8-a07e-e11cadec80ab' AND lat IS NULL;  -- Function Interior Design | 801 Descanso Bay Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173771, lng = -123.851675 WHERE id = 'c1adb770-4a9c-4174-b249-da8d77e0c6b4' AND lat IS NULL;  -- Gabriola Agricultural Co-op | 465 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173416, lng = -123.850115 WHERE id = '2c69a62f-c2f6-4d57-9650-dacd9d60052a' AND lat IS NULL;  -- Gabriola Arts Council | 476 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.133131, lng = -123.754718 WHERE id = '731a9f2e-8b8f-40f8-8ff3-3a1c4f0dd120' AND lat IS NULL;  -- Gabriola Community Hall | 2200 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174378, lng = -123.849577 WHERE id = '76efc0a2-9537-4788-96ab-2e352de89ceb' AND lat IS NULL;  -- Gabriola Fitness Centre | 480 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.157857, lng = -123.831830 WHERE id = 'b824bce6-bf57-4bae-8439-f484e260e94c' AND lat IS NULL;  -- Gabriola Golf & Country Club | 825 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174378, lng = -123.849577 WHERE id = '81260e9b-9e54-4fca-ba69-037f66b653c6' AND lat IS NULL;  -- Gabriola Island Chamber of Commerce | 480 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.149268, lng = -123.807038 WHERE id = '3fdae895-048c-45c5-9a03-71e7bcb8a638' AND lat IS NULL;  -- Gabriola Island Cidery Ltd | 1240 Coats Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.179767, lng = -123.825558 WHERE id = '1ebfc8d1-315b-4e62-be5c-e26dd2ec54b8' AND lat IS NULL;  -- Gabriola Island Farm Theatre | 945 Horseshoe Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.192122, lng = -123.855187 WHERE id = 'f678ccde-ca42-4a27-a383-ea09c71de139' AND lat IS NULL;  -- Gabriola Island General Store | 377 Berry Point Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.171380, lng = -123.848263 WHERE id = '8b968f54-7544-4acc-b9b4-9834f9284315' AND lat IS NULL;  -- Gabriola Museum Society | 505 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174235, lng = -123.848296 WHERE id = '02d221e5-dea0-464a-b5de-04f7c771d4c1' AND lat IS NULL;  -- Gabriola Sounder Media Inc. | 510 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.171697, lng = -123.860584 WHERE id = 'fe50592f-8b1d-457a-a792-72275eb3a511' AND lat IS NULL;  -- Gabriola Studios | 870 Pat Burns Ave, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.130727, lng = -123.754341 WHERE id = 'eb8083ee-4385-4477-8a33-03ff632d7eb9' AND lat IS NULL;  -- Gabriola Taxi Ltd. | 2215 Shaw Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.150438, lng = -123.726715 WHERE id = '71e4f307-9612-4900-a496-27e08d5e0e81' AND lat IS NULL;  -- Gabriola Theatre Centre | 1475 Peterson Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.197578, lng = -123.839357 WHERE id = 'aa189eda-9098-4a55-823f-ad8f029d5f5b' AND lat IS NULL;  -- Gabriola Welding | 661 Berry Point Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.156955, lng = -123.856028 WHERE id = '15762145-6061-47af-b3d6-22164ad34cd3' AND lat IS NULL;  -- Gallery Press | 1311 Harrison Way, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.172089, lng = -123.790364 WHERE id = 'fac468b1-3a98-464c-82d8-b0b77751feb8' AND lat IS NULL;  -- GI John | 1550 Wild Cherry Terr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.171522, lng = -123.820859 WHERE id = '5af280b5-fdeb-48aa-bacf-72ec3175fb41' AND lat IS NULL;  -- Golden Gnome Arts Inc. | 875 Mary Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.168370, lng = -123.843209 WHERE id = '450350ea-ccb3-4112-a6c4-3bfd1dfee026' AND lat IS NULL;  -- Good Earth Farm | 600 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174322, lng = -123.845427 WHERE id = '3d15e74a-2c11-4666-959a-53f36ad22559' AND lat IS NULL;  -- Ground Up Cafe & Catering | 560 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.148325, lng = -123.697214 WHERE id = 'c1c764f8-9a2b-4159-9bac-0ba7b157044d' AND lat IS NULL;  -- Grounds Control | 3350 Coast Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.149709, lng = -123.699597 WHERE id = 'f9c26a7d-fae4-4e47-bc50-9e25225d0b2e' AND lat IS NULL;  -- Gulf Island Seaplanes | 3383 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.153345, lng = -123.705391 WHERE id = '0c2464d4-70ed-4170-afc3-913831fa86f8' AND lat IS NULL;  -- Gulf Islands Tree Service | 3109 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.176508, lng = -123.791963 WHERE id = 'ff13b068-ef64-4470-bb55-46e9f5de6c55' AND lat IS NULL;  -- Hot Water Tank Guy | 1535 Whalebone Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.151672, lng = -123.725833 WHERE id = '940bd13a-7426-4f5c-93b7-d1cd11215bb3' AND lat IS NULL;  -- Hothouse Signs | 1460 Peterson Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174420, lng = -123.843586 WHERE id = '36a7e1cf-1323-44f9-b084-954034d9e3ae' AND lat IS NULL;  -- Island Meat and Deli | 590 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.171515, lng = -123.861414 WHERE id = '3e6b2087-2975-40d5-be99-5283ea0cf42c' AND lat IS NULL;  -- James Strobl Construction Ltd | 871 Pat Burns Ave, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.155705, lng = -123.790649 WHERE id = 'a17c680c-ff2b-4b6e-9abb-b11de5419ab1' AND lat IS NULL;  -- Knight Photography | 1310 Wilson Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174094, lng = -123.848919 WHERE id = 'dcc61d59-da8b-4f90-ac68-249cbd982c72' AND lat IS NULL;  -- Mad Rona's Coffee Bar | 500 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174235, lng = -123.848296 WHERE id = '03d63911-efae-4be3-a376-0414c54f227a' AND lat IS NULL;  -- Madrona Law Office | 510 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.153827, lng = -123.756856 WHERE id = '06a3f234-b932-4b28-aa0d-ae66d212cf3e' AND lat IS NULL;  -- Make Cheese with Paula – Madd Acres | 2125 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174342, lng = -123.846427 WHERE id = '56236f55-ce56-4a31-b66b-4918e9432131' AND lat IS NULL;  -- Mid Island Co-op | 548 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.196175, lng = -123.846663 WHERE id = '0d2741ce-9632-4636-8410-416ea967bd33' AND lat IS NULL;  -- Moonshine Studio | 525 Berry Point Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174378, lng = -123.849577 WHERE id = '9dc62260-8d64-467d-bf59-e169ccd786ba' AND lat IS NULL;  -- Nature Spirit Earth Market | 480 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173212, lng = -123.844889 WHERE id = 'f6a829c9-7c22-4e5d-b08b-0bf33de082b9' AND lat IS NULL;  -- Nesters Market | 575 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.181086, lng = -123.801822 WHERE id = 'b6952d04-e5a7-48c5-be36-97bce27fee9f' AND lat IS NULL;  -- On The Sea BnB - Gabriola Island | 1350 Sea Lover's Lane, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174378, lng = -123.849577 WHERE id = '53035322-e01e-4b48-a28b-a793f671d75e' AND lat IS NULL;  -- Opal Jewellery Studio | 480 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.177159, lng = -123.845446 WHERE id = '4f7661ac-8c30-4b57-bf67-ae5b410cd659' AND lat IS NULL;  -- Our House Art Studio | 737 Ross Way, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.150632, lng = -123.701895 WHERE id = 'b78f2977-8208-41fb-a60e-899a6da63d39' AND lat IS NULL;  -- Page's Inn on Silva Bay | 3415 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.148325, lng = -123.697214 WHERE id = 'c7674a88-6505-492d-a3ba-5ee4e3a38539' AND lat IS NULL;  -- Page's Resort & Marina | 3350 Coast Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.175037, lng = -123.833030 WHERE id = '8210b152-baea-4c31-ba3b-4e766dec10d7' AND lat IS NULL;  -- Paradise Island Alpaca Farm | 785 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.169399, lng = -123.859607 WHERE id = '2cafe34f-b82b-4626-94aa-03f0cd85987d' AND lat IS NULL;  -- PearlsandPoets Editing and Communications | 930 Pat Burns Ave, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173679, lng = -123.839851 WHERE id = '6c4cab32-fd92-4d9c-8d1a-126e704837b6' AND lat IS NULL;  -- People for a Healthy Community on Gabriola (PHC) | 675 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.150632, lng = -123.701895 WHERE id = 'def99724-462e-45c5-b318-e33b961b9d7c' AND lat IS NULL;  -- Pier Gallery Artists Collective | 3415 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.160667, lng = -123.858405 WHERE id = 'ea8ddb25-087c-4749-ab0c-c646c49f4e6b' AND lat IS NULL;  -- Power Play Cleaning | 1184 McGillvary Ave, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.192984, lng = -123.857328 WHERE id = '211b0087-a8b8-46dc-babd-57eee3999631' AND lat IS NULL;  -- RAINWATER DESIGNERS LTD. | 275 Ricardo Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.179311, lng = -123.815916 WHERE id = 'dca2f59b-9fcb-4827-a7de-e151347ffdb0' AND lat IS NULL;  -- Rombough's Auto Detailing | 664 Rollo Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173212, lng = -123.844889 WHERE id = 'a2a35aa6-54d9-47db-9366-d34d427c880d' AND lat IS NULL;  -- Royal LePage Nanaimo Realty Gabriola | 575 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174063, lng = -123.795698 WHERE id = '2aa4e1dc-2f2e-4f0a-a483-33f2c2fc7a5b' AND lat IS NULL;  -- Salish Island Secrets Gabriola | 1444 Wild Cherry Terr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.184748, lng = -123.808723 WHERE id = '825cf4c3-cae4-4287-9e48-f4b66d06d09d' AND lat IS NULL;  -- Sea 'N' Stars BNB at Bell's Landing | 1206 The Strand, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.138042, lng = -123.699010 WHERE id = '838e6ed9-206b-4506-83bc-0e68fae5eba9' AND lat IS NULL;  -- Sea Lion Electric Equipment | 1860 Hyham Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.149709, lng = -123.699597 WHERE id = '7c54674a-235e-49de-8771-e4669195bbf7' AND lat IS NULL;  -- Silva Bay Resort & Marina Ltd. | 3383 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.153166, lng = -123.704592 WHERE id = 'a1c11490-31eb-4ec9-bcf6-21ddf52453fd' AND lat IS NULL;  -- Silva Bay View BnB | 3117 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.132295, lng = -123.738448 WHERE id = 'fdf63e60-c61d-4da8-be32-bd84e94e04a8' AND lat IS NULL;  -- Slow Rise Bakery | 2500 Coho Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.190782, lng = -123.870290 WHERE id = 'ff4e99a7-b23d-4db1-948a-622d10e05c61' AND lat IS NULL;  -- Solid Masonry | 117 Malaspina Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.137874, lng = -123.702073 WHERE id = '416a8af6-2092-456f-ba23-0015e7f1a5af' AND lat IS NULL;  -- Summer Rain Water Delivery | 3153 Whalley Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.200373, lng = -123.826994 WHERE id = 'e8e6615b-e530-4cf5-bb5e-4cb1e2dde957' AND lat IS NULL;  -- Surf Lodge & Pub | 885 Berry Point Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.152597, lng = -123.779672 WHERE id = '8f241963-6dd9-4eda-bdc3-60f5d6d2225b' AND lat IS NULL;  -- Tait Road Farm Cooperative | 1766 Tait Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.146528, lng = -123.777510 WHERE id = '691e5c31-88b1-4193-88e3-55ca656ea026' AND lat IS NULL;  -- Tammy Hudgeon Studio | 1790 Seymour Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.167693, lng = -123.846762 WHERE id = 'be5764cf-40e3-473e-a184-b91988b164fc' AND lat IS NULL;  -- The Garden Bed | 565 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.167693, lng = -123.846762 WHERE id = 'd8a04940-0564-4cc4-9a3d-9f48b6599772' AND lat IS NULL;  -- The Garden Bed Guesthouse | 565 South Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.181444, lng = -123.815856 WHERE id = '34e5524b-0035-4431-a98c-206b5b9dd76d' AND lat IS NULL;  -- The Green Bough Studio & Gallery | 600 Rollo Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.171310, lng = -123.788373 WHERE id = '8c0781cc-295b-4d84-93f0-1bef6cfadc7d' AND lat IS NULL;  -- The Happy Hippy Soap Company | 1586 Wild Cherry Terr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.191344, lng = -123.863176 WHERE id = '5836831c-ee3f-4213-a136-7356df725143' AND lat IS NULL;  -- The Haven | 240 Davis Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174420, lng = -123.843586 WHERE id = '80bdeec2-ad7a-4173-aaba-79de7cf1a31f' AND lat IS NULL;  -- The Swap Shop | 590 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173212, lng = -123.844889 WHERE id = 'e0f0a7f4-33b8-44fe-abd1-ab60b669967f' AND lat IS NULL;  -- Tina & Guy – Royal LePage Gabriola | 575 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.131500, lng = -123.741759 WHERE id = '94dddc2f-4557-42e7-bbab-d4a25ccca1e7' AND lat IS NULL;  -- Topographics Landscape Architecture | 2434 Islands View Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.167113, lng = -123.838032 WHERE id = '6ff2916f-4e45-4a1f-8b2e-28ec90633857' AND lat IS NULL;  -- Trelawny Consulting Group / Agio Publishing House | 698 Dogwood Cres, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.136001, lng = -123.778903 WHERE id = '12f494d6-6bec-457c-a8eb-f414c937549c' AND lat IS NULL;  -- Trusted Coverage | 1746 El Verano Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.192122, lng = -123.855187 WHERE id = '2869bda2-e20d-4503-9293-19464de1bb7f' AND lat IS NULL;  -- Twin Beaches Equipment Rental and Gabriola Gravel Mart | 377 Berry Point Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.173114, lng = -123.844482 WHERE id = 'c536d8ea-d884-4822-bde1-c5765813d81e' AND lat IS NULL;  -- Vancouver Island Regional Library – Gabriola Branch | UNIT 5 -- 575 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.158026, lng = -123.733346 WHERE id = 'def32609-1859-4ca7-bd28-bf9925f147ed' AND lat IS NULL;  -- Veritas Silver Designs | 1275 Hamlet Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174545, lng = -123.787136 WHERE id = 'b485e311-05cf-4913-8e13-c698150e788c' AND lat IS NULL;  -- Whalebone Studio | 1616 Whalebone Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.196363, lng = -123.821532 WHERE id = '6a7ad9e6-9e62-4328-a481-1f8b421becd5' AND lat IS NULL;  -- Wild Wellness | 1155 Berry Point Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.175999, lng = -123.831642 WHERE id = 'c57062b1-10e3-473f-9809-51cdd505da80' AND lat IS NULL;  -- Wildrose Farm & Garden Centre | 750 Tin Can Alley, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.140164, lng = -123.756405 WHERE id = '6fe9c2ed-f22c-464d-a0ff-378799409194' AND lat IS NULL;  -- William H. Pope Law Office | 1725 Lackehaven Dr, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.131257, lng = -123.729378 WHERE id = '9bbeac6e-c01c-45b3-b3e6-eeb95941d159' AND lat IS NULL;  -- Willow Creek Farm | 2000 Thompson Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174378, lng = -123.849577 WHERE id = '27c46c5c-ae18-4c5f-9b7f-7894b75de0ac' AND lat IS NULL;  -- Wishbone Specialty Foods and Gifts | 480 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.174094, lng = -123.848919 WHERE id = 'e8c70da1-c45c-4ac6-abd3-afec33c27f0e' AND lat IS NULL;  -- Woodfire Restaurant & Catering | 500 North Rd, Gabriola Island, BC
UPDATE public.directory_businesses SET lat = 49.145167, lng = -123.700288 WHERE id = 'b924afb2-a664-4d30-9897-c2b01f1ffd45' AND lat IS NULL;  -- WurHere B&B | 3200 Coast Rd, Gabriola Island, BC

-- Venues (5)
UPDATE public.venues SET address = '2200 South Road', lat = 49.133131, lng = -123.754718 WHERE id = 'a224aa6e-7b27-4f6e-8521-40516df2d59d';  -- Gabriola Community Hall | 2200 South Rd, Gabriola Island, BC (address corrected by Alex; was 476)
-- The AGI Hall (465 South Road) and the Gabriola Arts Council (476 South Road) are two places.
-- They were one venue, "Gabriola Arts & Heritage Centre (AGI Hall)" at 476. Split them:
UPDATE public.venues
SET name = 'AGI Hall',
    alternate_names = ARRAY['AGI Co-op', 'Gabriola Agricultural Co-op', 'Agricultural Hall'],
    address = '465 South Road', lat = 49.173771, lng = -123.851675
WHERE id = '2293e6bc-6e0f-4855-b7ae-10dab50ed93d';  -- 465 South Rd, Gabriola Island, BC

INSERT INTO public.venues (name, address, city, postal_code, alternate_names, lat, lng)
SELECT 'Gabriola Arts Council', '476 South Road', 'Gabriola', 'V0R 1X0',
       ARRAY['Gabriola Arts & Heritage Centre', 'Arts & Heritage Centre', 'GAHC', 'Arts Centre', 'Heritage Centre'],
       49.173416, -123.850115   -- 476 South Rd, Gabriola Island, BC
WHERE NOT EXISTS (SELECT 1 FROM public.venues WHERE name = 'Gabriola Arts Council');
UPDATE public.venues SET lat = 49.149709, lng = -123.699597 WHERE id = 'baf7fec6-6388-475b-83b4-6064f6aa842e' AND lat IS NULL;  -- Silva Bay Marina | 3383 South Rd, Gabriola Island, BC
UPDATE public.venues SET lat = 49.170400, lng = -123.847431 WHERE id = 'f652b861-8e03-4955-95d7-20ed2229a579' AND lat IS NULL;  -- The Rollo Centre | 525 South Rd, Gabriola Island, BC
UPDATE public.venues SET lat = 49.173212, lng = -123.844889 WHERE id = 'c7b7b2f1-58a3-43a8-b997-e35bd33e5719' AND lat IS NULL;  -- Gabriola Library | 575 North Rd, Gabriola Island, BC

COMMIT;

-- Check: how many businesses and venues now have a map position
SELECT
  (SELECT count(*) FROM public.directory_businesses WHERE lat IS NOT NULL AND lng IS NOT NULL) AS businesses_on_map,
  (SELECT count(*) FROM public.venues WHERE lat IS NOT NULL AND lng IS NOT NULL) AS venues_on_map;
