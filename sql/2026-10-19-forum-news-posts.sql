-- ============================================================================
-- Forum: five Gabriola news summaries - Version 1.0.0 - 2026-10-19
-- Posted as the Gabriola Connects account (same as the earlier Island News posts).
-- Sources: Gabriola Sounder, Oct. 8 and Oct. 14, 2026.
-- Runs as one unit: if anything fails, nothing is added.
-- Undo: DELETE FROM public.bbs_posts WHERE user_id = '713881fc-2506-490c-8d72-4c6205bd1093' AND created_at::date = '2026-10-19';
-- ============================================================================

BEGIN;

-- 1. Health, Housing & Safety: fire budget
INSERT INTO public.bbs_posts (category_id, category, title, body, user_id, display_name, is_anonymous, view_count, reply_count, is_pinned, is_active)
SELECT c.id, c.slug, $p$Fire Board turns down 5.5% budget increase, public meeting Oct. 21$p$, $p$The Gabriola Fire Protection Improvement District Board voted down a proposed **2027 budget of $1,805,579**, an increase of 5.5% ($94,232) over this year's $1,711,374.

Only Chair Wayne Mercier voted for it. Matt Dow, Liz Wallinger, David Chorneyko, Jacqui Braid and Oliver Bussler voted against, and Dimitri Tzotzos was absent.

Reasons given at the meeting:

- Oliver Bussler said he had only seen the latest version the day before, and raised questions about pager pay for Duty Officers, which was raised about two years ago without a Board decision on record.
- David Chorneyko wanted an increase under 4%, and pointed to a coming union contract with significant wage increases.
- Corporate Officer Marjorie Colebrook said the increase comes mainly from unionization, the province's required move to NextGen 911, and higher supply costs from tariffs.

For context, the budget went up 37.5% in 2025 and 21.7% in 2026. The budget and levy have to be approved and sent to the province by Oct. 31.

**Special General Meeting: Wednesday, Oct. 21 at 5 p.m. at the Fire Hall. It is open to the public.**

What would you want the Board to hear?

**Sources**
- [Gabriola Sounder: Fire Board votes down 5.5% increase in budget for 2027 (Oct. 14, 2026)](https://soundernews.com/fire-board-votes-down-5-5-increase-in-budget-for-2027/)

---
*Summary written by Claude, the Gabriola Connects AI assistant, from the source above. Please check the original for full details.*$p$, '713881fc-2506-490c-8d72-4c6205bd1093', 'Gabriola Connects', false, 0, 0, false, true
FROM public.bbs_categories c WHERE c.slug = 'healthcare-seniors';

-- 2. Health, Housing & Safety: GILSS housing purchase
INSERT INTO public.bbs_posts (category_id, category, title, body, user_id, display_name, is_anonymous, view_count, reply_count, is_pinned, is_active)
SELECT c.id, c.slug, $p$Land Stewards buy three homes on Church Street to keep them affordable$p$, $p$The **Gabriola Island Land Stewards Society (GILSS)**, a charity and community land trust, has bought three homes in the 745 Church Street part of **Meadow Wood Village**, across from Fire Hall #1. It is the society's first purchase.

The homes were built in 1994 and have been rented as supportive housing for seniors and others. Over the past year some units in the development were sold privately while tenants were still living in them. With this purchase, the tenants in these three homes are secure in their housing for the long term.

The purchase was made possible by an **anonymous donor**, who said Gabriola needs more secure, affordable rental housing and encouraged others who can afford it to support GILSS. The price was not made public.

GILSS President Sibyl Frei thanked the donor and said the society will keep looking for properties for housing, sustainable farming and local economic development. GILSS plans repairs and updates and will work with the strata on any larger work.

**Sources**
- [Gabriola Sounder: GILSS purchases properties on Church for affordable housing (Oct. 14, 2026)](https://soundernews.com/gabriola-island-land-stewards-society-purchases-properties-on-church-for-affordable-housing/)

---
*Summary written by Claude, the Gabriola Connects AI assistant, from the source above. Please check the original for full details.*$p$, '713881fc-2506-490c-8d72-4c6205bd1093', 'Gabriola Connects', false, 0, 0, false, true
FROM public.bbs_categories c WHERE c.slug = 'healthcare-seniors';

-- 3. Ferry, Roads & Trails: Ferry Hill and Village Way
INSERT INTO public.bbs_posts (category_id, category, title, body, user_id, display_name, is_anonymous, view_count, reply_count, is_pinned, is_active)
SELECT c.id, c.slug, $p$Ferry Hill walking route: two options being studied, report due in January$p$, $p$At the RDN's Gabriola parks committee (POSAC) meeting on Sept. 21, staff gave an update on making Ferry Hill safer for people walking and cycling.

Two options are being worked on with the Ministry of Transportation and Transit:

- **North side (cliff side):** would need significant blasting and work on the ditch.
- **South side (beside the ferry line):** close to an edge, so it would need a sidewalk and a crosswalk across ferry loading and unloading traffic.

RDN Parks Planner Riccardo Tavella said both will be a big challenge. BC Ferries has not taken part, so both plans have to bring people to the current pedestrian entrance at the terminal. Director Vanessa Craig said planning is hard without knowing BC Ferries' plans for the terminal, though a rebuild is unlikely in the next 10 years. **A final feasibility study is expected in early January 2027 for public discussion.**

**Village Way crosswalks:** RDN staff have drawn up crosswalks across the driveways along the Village Way path on North Road and sent them to the Ministry for review. Some may be rainbow-coloured. A pilot will also open up the railings at Ross Way, the Co-op gas station entrance and both Madrona Marketplace entrances, so drivers and walkers can see each other better.

Which option would you choose for Ferry Hill?

**Sources**
- [Gabriola Sounder: Parks committee update on sportsfield, ferry hill, green burial and more (Oct. 14, 2026)](https://soundernews.com/parks-committee-update-on-sportsfield-ferry-hill-green-burial-and-more/)

---
*Summary written by Claude, the Gabriola Connects AI assistant, from the source above. Please check the original for full details.*$p$, '713881fc-2506-490c-8d72-4c6205bd1093', 'Gabriola Connects', false, 0, 0, false, true
FROM public.bbs_categories c WHERE c.slug = 'ferry-transportation';

-- 4. Local Government & Planning: community centre and green burial
INSERT INTO public.bbs_posts (category_id, category, title, body, user_id, display_name, is_anonymous, view_count, reply_count, is_pinned, is_active)
SELECT c.id, c.slug, $p$A community centre at the sportsfield, and green burial on Gabriola$p$, $p$Two longer-term projects came up at the RDN's Gabriola parks committee (POSAC) meeting on Sept. 21.

**Community centre:** The RDN has added a possible community centre to its sportsfield feasibility study. A working group will be formed to decide what it should include, such as rooms, parking and activities, ahead of the 2027 study. Director Vanessa Craig said it would give the island activity space it doesn't have now. The Elementary School gym is only open to the public after school, which limits daytime programs. She said it should fill gaps rather than duplicate what already exists. Staff hope to have a consultant hired by the next POSAC meeting in **February 2027**.

**Green burial:** The RDN's study on finding land for a green burial site on Gabriola is nearly done, and staff say it is feasible. Possible sites have been identified and will go to a closed RDN board meeting. The Gabriola Island Memorial Society asked for the study and would run the cemetery. Craig said a donated piece of land would be the best solution.

What would you want in a community centre?

**Sources**
- [Gabriola Sounder: Parks committee update on sportsfield, ferry hill, green burial and more (Oct. 14, 2026)](https://soundernews.com/parks-committee-update-on-sportsfield-ferry-hill-green-burial-and-more/)

---
*Summary written by Claude, the Gabriola Connects AI assistant, from the source above. Please check the original for full details.*$p$, '713881fc-2506-490c-8d72-4c6205bd1093', 'Gabriola Connects', false, 0, 0, false, true
FROM public.bbs_categories c WHERE c.slug = 'island-issues-governance';

-- 5. Business, Arts & Events: Studio Tour at 30
INSERT INTO public.bbs_posts (category_id, category, title, body, user_id, display_name, is_anonymous, view_count, reply_count, is_pinned, is_active)
SELECT c.id, c.slug, $p$30 years of the Thanksgiving Studio Tour$p$, $p$This year's Thanksgiving Studio Tour was the **30th**, with more than 70 artists working in painting, ceramics, textiles, sculpture and more.

It started as a kitchen-table idea in Mary Jo Fulmer's kitchen. The founders named by the Sounder are John Capon, Tawny Maclachlan Capon, Gail Lund, Bob Bossin, Mary Jo Fulmer, Marty Sheppard and Liz Matthews. That group became the Festival Gabriola Society, which also ran the Dancing Man Festival. The first Thanksgiving Gallery and Studio Tour was in 1997, and in 2006 the society became the **Gabriola Arts Council**.

Some of the artists have been there from the start. Laura Handford has been on the Tour since year one, this year at Moonshine Studio on Berry Point Road with her daughter Lu, and Graham Sheehan of Sunstone Pottery on Argyle Lane has been on it for 30 years.

The anniversary added Rainbow Studio for emerging LGBTQ2S+ artists at the Theatre Centre, "Lighting a Path" by seven First Nations artists at the Museum, and "Art Speaks", a collage of 30 years of Tour memories, at the Arts & Heritage Centre.

Did you go this year? What was your favourite stop?

**Sources**
- [Gabriola Sounder: Celebrating 30 years of the Thanksgiving Studio Tour (Oct. 8, 2026)](https://soundernews.com/celebrating-30-years-of-the-thanksgiving-studio-tour/)
- [Gabriola Arts Council: Thanksgiving Studio Tour](https://artsgabriola.ca/thanksgiving-studio-tour/)

---
*Summary written by Claude, the Gabriola Connects AI assistant, from the sources above. Please check the originals for full details.*$p$, '713881fc-2506-490c-8d72-4c6205bd1093', 'Gabriola Connects', false, 0, 0, false, true
FROM public.bbs_categories c WHERE c.slug = 'business-economy';

COMMIT;

-- Check: should list the five new posts with their topics
SELECT p.title, c.name AS topic
FROM public.bbs_posts p JOIN public.bbs_categories c ON c.slug = p.category
WHERE p.user_id = '713881fc-2506-490c-8d72-4c6205bd1093' AND p.created_at::date = '2026-10-19'
ORDER BY p.created_at;
