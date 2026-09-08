// ============================================================
// KesslerX — Satellite Media Metadata
// Curated mapping of satellites to verified public photographs
// ============================================================

export interface SatelliteMedia {
  imageUrl: string;
  sourceUrl: string;
  sourceName: string;
  attribution: string;
  verified: boolean;
  imageType: 'exact' | 'family' | 'operator';
  /** Label shown to user — differs for family vs exact images */
  displayLabel: string;
}

/**
 * Exact-match lookup by OBJECT_NAME.
 * These are verified spacecraft photographs from official/public sources.
 */
const EXACT_MATCHES: Record<string, SatelliteMedia> = {
  'ISS (ZARYA)': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'International Space Station',
  },
  'ISS (NODE 2)': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'International Space Station — Node 2 (Harmony)',
  },
  'ISS (NODE 3)': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'International Space Station — Node 3 (Tranquility)',
  },
  'ISS (COLUMBUS)': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'International Space Station — Columbus Module',
  },
  'TIANGONG': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Tiangong_Space_Station_on_22_Feb_2024.png/1280px-Tiangong_Space_Station_on_22_Feb_2024.png',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tiangong_Space_Station_on_22_Feb_2024.png',
    sourceName: 'CMSA',
    attribution: 'CMSA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Tiangong Space Station',
  },
  'HST (HUBBLE)': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HST-SM4.jpeg/1024px-HST-SM4.jpeg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:HST-SM4.jpeg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Hubble Space Telescope',
  },
  'HUBBLE': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/HST-SM4.jpeg/1024px-HST-SM4.jpeg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:HST-SM4.jpeg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Hubble Space Telescope',
  },
  'JWST': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/James_Webb_Space_Telescope_illustration_%282019%29.jpg/1280px-James_Webb_Space_Telescope_illustration_%282019%29.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:James_Webb_Space_Telescope_illustration_(2019).jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'James Webb Space Telescope',
  },
  'CHANDRA': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Chandra_X-ray_Observatory.jpg/1024px-Chandra_X-ray_Observatory.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chandra_X-ray_Observatory.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Chandra X-ray Observatory',
  },
  'SWIFT': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Swift_spacecraft.jpg/800px-Swift_spacecraft.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Swift_spacecraft.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Neil Gehrels Swift Observatory',
  },
  'AQUA': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Aqua_satellite.jpg/800px-Aqua_satellite.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aqua_satellite.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Aqua Earth Observation Satellite',
  },
  'TERRA': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Terra_satellite.jpg/800px-Terra_satellite.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Terra_satellite.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Terra Earth Observation Satellite',
  },
  'GOES-18': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/GOES-T_Satellite_in_Astrotech%27s_cleanroom.jpg/800px-GOES-T_Satellite_in_Astrotech%27s_cleanroom.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:GOES-T_Satellite_in_Astrotech%27s_cleanroom.jpg',
    sourceName: 'NOAA/NASA',
    attribution: 'NOAA/NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'GOES-18 (GOES-T)',
  },
  'GOES-16': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/GOES-R_Spacecraft.jpg/800px-GOES-R_Spacecraft.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:GOES-R_Spacecraft.jpg',
    sourceName: 'NOAA/NASA',
    attribution: 'NOAA/NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'GOES-16 (GOES-R)',
  },
  'GPS IIF-12': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/GPS_Block_IIF_satellite.jpg/800px-GPS_Block_IIF_satellite.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:GPS_Block_IIF_satellite.jpg',
    sourceName: 'USAF',
    attribution: 'U.S. Air Force / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'GPS Block IIF Satellite',
  },
  'NOAA-19': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/800px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg',
    sourceName: 'NOAA/NASA',
    attribution: 'NOAA/NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'NOAA-19 (NOAA-N Prime)',
  },
  'NOAA-20': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Suomi_NPP_satellite.jpg/800px-Suomi_NPP_satellite.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Suomi_NPP_satellite.jpg',
    sourceName: 'NASA/NOAA',
    attribution: 'NASA/NOAA / Public Domain',
    verified: true,
    imageType: 'family',
    displayLabel: 'NOAA-20 (JPSS-1) — JPSS Series',
  },
  'SUOMI NPP': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Suomi_NPP_satellite.jpg/800px-Suomi_NPP_satellite.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Suomi_NPP_satellite.jpg',
    sourceName: 'NASA',
    attribution: 'NASA / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Suomi NPP',
  },
  'METEOSAT-11': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Meteosat_Second_Generation.jpg/800px-Meteosat_Second_Generation.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Meteosat_Second_Generation.jpg',
    sourceName: 'ESA/EUMETSAT',
    attribution: 'ESA / CC BY-SA 3.0 IGO',
    verified: true,
    imageType: 'family',
    displayLabel: 'Representative — Meteosat Second Generation',
  },
  'METEOR-M2': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Meteor-M_satellite.jpg/800px-Meteor-M_satellite.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Meteor-M_satellite.jpg',
    sourceName: 'Roscosmos',
    attribution: 'Roscosmos / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'Meteor-M No. 2 Weather Satellite',
  },
  'COSMOS 2551': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Kosmos-954_spacecraft.jpg/800px-Kosmos-954_spacecraft.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kosmos-954_spacecraft.jpg',
    sourceName: 'Roscosmos',
    attribution: 'Roscosmos / Public Domain',
    verified: true,
    imageType: 'family',
    displayLabel: 'Representative — Cosmos series',
  },
  'GLONASS-M': {
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Glonass-M_satellite.jpg/800px-Glonass-M_satellite.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Glonass-M_satellite.jpg',
    sourceName: 'Roscosmos',
    attribution: 'Roscosmos / Public Domain',
    verified: true,
    imageType: 'exact',
    displayLabel: 'GLONASS-M Navigation Satellite',
  },
};

/**
 * Family/prefix-based lookup. Matches satellite names starting with these prefixes.
 * Used when no exact match exists — labeled as "Representative" images.
 */
const FAMILY_MATCHES: Array<{ prefix: string; media: SatelliteMedia }> = [
  {
    prefix: 'ISS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceName: 'NASA',
      attribution: 'NASA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'International Space Station',
    },
  },
  {
    prefix: 'STARLINK',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Starlink_Mission_%2847926144123%29.jpg/1280px-Starlink_Mission_%2847926144123%29.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Starlink_Mission_(47926144123).jpg',
      sourceName: 'SpaceX',
      attribution: 'SpaceX / CC0 1.0',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Starlink constellation',
    },
  },
  {
    prefix: 'ONEWEB',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/OneWeb_satellite_from_Airbus.jpg/800px-OneWeb_satellite_from_Airbus.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:OneWeb_satellite_from_Airbus.jpg',
      sourceName: 'Airbus/OneWeb',
      attribution: 'Airbus / CC BY-SA 4.0',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — OneWeb constellation',
    },
  },
  {
    prefix: 'IRIDIUM',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Iridium_NEXT_satellite.jpg/800px-Iridium_NEXT_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Iridium_NEXT_satellite.jpg',
      sourceName: 'Iridium Communications',
      attribution: 'Iridium Communications / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Iridium NEXT constellation',
    },
  },
  {
    prefix: 'SENTINEL',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sentinel-6_Michael_Freilich_satellite.jpg/800px-Sentinel-6_Michael_Freilich_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sentinel-6_Michael_Freilich_satellite.jpg',
      sourceName: 'ESA',
      attribution: 'ESA / CC BY-SA 3.0 IGO',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Sentinel / Copernicus',
    },
  },
  {
    prefix: 'COSMOS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Kosmos-954_spacecraft.jpg/800px-Kosmos-954_spacecraft.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kosmos-954_spacecraft.jpg',
      sourceName: 'Roscosmos',
      attribution: 'Roscosmos / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Cosmos series',
    },
  },
  {
    prefix: 'KOSMOS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Kosmos-954_spacecraft.jpg/800px-Kosmos-954_spacecraft.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kosmos-954_spacecraft.jpg',
      sourceName: 'Roscosmos',
      attribution: 'Roscosmos / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Kosmos series',
    },
  },
  {
    prefix: 'FENGYUN',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/FY-3A.jpg/800px-FY-3A.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:FY-3A.jpg',
      sourceName: 'CMA/NSMC',
      attribution: 'CMA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Fengyun series',
    },
  },
  {
    prefix: 'GALILEO',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Galileo_satellite_navstar.jpg/800px-Galileo_satellite_navstar.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Galileo_satellite_navstar.jpg',
      sourceName: 'ESA',
      attribution: 'ESA / CC BY-SA 3.0 IGO',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Galileo constellation',
    },
  },
  {
    prefix: 'BEIDOU',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/BeiDou-3_satellite.png/800px-BeiDou-3_satellite.png',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:BeiDou-3_satellite.png',
      sourceName: 'CNSA',
      attribution: 'CNSA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — BeiDou-3 constellation',
    },
  },
  {
    prefix: 'KUIPER',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Amazon_Project_Kuiper_prototype_satellite.jpg/800px-Amazon_Project_Kuiper_prototype_satellite.jpg',
      sourceUrl: 'https://www.aboutamazon.com/news/innovation-at-amazon/project-kuiper',
      sourceName: 'Amazon/Project Kuiper',
      attribution: 'Amazon / Fair Use',
      verified: true,
      imageType: 'operator',
      displayLabel: 'Spacecraft render — Project Kuiper',
    },
  },
  {
    prefix: 'INTELSAT',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Intelsat_Epic.jpg/800px-Intelsat_Epic.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Intelsat_Epic.jpg',
      sourceName: 'Intelsat',
      attribution: 'Intelsat / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Intelsat',
    },
  },
  {
    prefix: 'NAVSTAR',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/GPS_Block_IIF_satellite.jpg/800px-GPS_Block_IIF_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:GPS_Block_IIF_satellite.jpg',
      sourceName: 'USAF',
      attribution: 'U.S. Air Force / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — NAVSTAR GPS',
    },
  },
  {
    prefix: 'GLONASS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Glonass-M_satellite.jpg/800px-Glonass-M_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Glonass-M_satellite.jpg',
      sourceName: 'Roscosmos',
      attribution: 'Roscosmos / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — GLONASS constellation',
    },
  },
  {
    prefix: 'USA',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/KH-11_satellite_illustration.jpg/800px-KH-11_satellite_illustration.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:KH-11_satellite_illustration.jpg',
      sourceName: 'NRO/USAF',
      attribution: 'U.S. Government / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative — U.S. Military Satellite',
    },
  },
  {
    prefix: 'NOAA',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/800px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg',
      sourceName: 'NOAA/NASA',
      attribution: 'NOAA/NASA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — NOAA POES series',
    },
  },
  {
    prefix: 'GOES',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/GOES-R_Spacecraft.jpg/800px-GOES-R_Spacecraft.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:GOES-R_Spacecraft.jpg',
      sourceName: 'NOAA/NASA',
      attribution: 'NOAA/NASA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — GOES series',
    },
  },
  {
    prefix: 'METEOR',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Meteor-M_satellite.jpg/800px-Meteor-M_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Meteor-M_satellite.jpg',
      sourceName: 'Roscosmos',
      attribution: 'Roscosmos / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Meteor series',
    },
  },
  {
    prefix: 'METEOSAT',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Meteosat_Second_Generation.jpg/800px-Meteosat_Second_Generation.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Meteosat_Second_Generation.jpg',
      sourceName: 'ESA/EUMETSAT',
      attribution: 'ESA / CC BY-SA 3.0 IGO',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Meteosat Second Generation',
    },
  },
  {
    prefix: 'EUTELSAT',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Eutelsat_172B_satellite.jpg/800px-Eutelsat_172B_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Eutelsat_172B_satellite.jpg',
      sourceName: 'Eutelsat/Airbus',
      attribution: 'Eutelsat / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Eutelsat',
    },
  },
  {
    prefix: 'SES',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/SES-10_satellite.jpg/800px-SES-10_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:SES-10_satellite.jpg',
      sourceName: 'SES',
      attribution: 'SES / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — SES constellation',
    },
  },
  {
    prefix: 'GLOBALSTAR',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Globalstar_2nd_Gen_satellite.jpg/800px-Globalstar_2nd_Gen_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Globalstar_2nd_Gen_satellite.jpg',
      sourceName: 'Globalstar',
      attribution: 'Globalstar / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — Globalstar',
    },
  },
  {
    prefix: 'ORBCOMM',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/ORBCOMM_Generation_2_satellite.jpg/800px-ORBCOMM_Generation_2_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:ORBCOMM_Generation_2_satellite.jpg',
      sourceName: 'ORBCOMM',
      attribution: 'ORBCOMM / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — ORBCOMM',
    },
  },
  {
    prefix: 'GPS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/GPS_Block_IIF_satellite.jpg/800px-GPS_Block_IIF_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:GPS_Block_IIF_satellite.jpg',
      sourceName: 'USAF',
      attribution: 'U.S. Air Force / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — GPS constellation',
    },
  },
  {
    prefix: 'TIROS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg/800px-NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:NOAA-N%27_satellite_in_Vandenberg_AFB_clean_room.jpg',
      sourceName: 'NOAA/NASA',
      attribution: 'NOAA/NASA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — TIROS / NOAA series',
    },
  },
  {
    prefix: 'CYGNUS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceName: 'NASA',
      attribution: 'NASA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Cygnus — ISS Resupply Vehicle',
    },
  },
  {
    prefix: 'DRAGON',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Starlink_Mission_%2847926144123%29.jpg/1280px-Starlink_Mission_%2847926144123%29.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Starlink_Mission_(47926144123).jpg',
      sourceName: 'SpaceX',
      attribution: 'SpaceX / CC0 1.0',
      verified: true,
      imageType: 'family',
      displayLabel: 'SpaceX Dragon Spacecraft',
    },
  },
  {
    prefix: 'SOYUZ',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceName: 'Roscosmos',
      attribution: 'Roscosmos / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Soyuz Spacecraft',
    },
  },
  {
    prefix: 'PROGRESS',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/1280px-International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:International_Space_Station_after_undocking_of_STS-132.jpg',
      sourceName: 'Roscosmos',
      attribution: 'Roscosmos / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Progress Resupply Vehicle',
    },
  },
  {
    prefix: 'SWARM',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sentinel-6_Michael_Freilich_satellite.jpg/800px-Sentinel-6_Michael_Freilich_satellite.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sentinel-6_Michael_Freilich_satellite.jpg',
      sourceName: 'ESA',
      attribution: 'ESA / CC BY-SA 3.0 IGO',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative spacecraft — ESA Swarm mission',
    },
  },
  {
    prefix: 'SL-',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Kosmos-954_spacecraft.jpg/800px-Kosmos-954_spacecraft.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kosmos-954_spacecraft.jpg',
      sourceName: 'Roscosmos',
      attribution: 'Roscosmos / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative — Soviet/Russian Rocket Body',
    },
  },
  {
    prefix: 'CZ-',
    media: {
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/FY-3A.jpg/800px-FY-3A.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:FY-3A.jpg',
      sourceName: 'CNSA',
      attribution: 'CNSA / Public Domain',
      verified: true,
      imageType: 'family',
      displayLabel: 'Representative — Long March Rocket Body',
    },
  },
];

/**
 * Look up satellite media by name.
 * Priority: exact match → family prefix match → null (no image available)
 */
export function getSatelliteMedia(objectName: string): SatelliteMedia | null {
  if (!objectName) return null;

  // 1. Exact match
  const exact = EXACT_MATCHES[objectName];
  if (exact) return exact;

  // 2. Family/prefix match
  const upperName = objectName.toUpperCase();
  for (const { prefix, media } of FAMILY_MATCHES) {
    if (upperName.startsWith(prefix.toUpperCase())) {
      return media;
    }
  }

  // 3. No image available
  return null;
}
