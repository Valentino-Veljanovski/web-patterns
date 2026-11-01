/**
 * JsonLd
 * ======
 * `<JsonLd data={…} />` renders one `<script type="application/ld+json">`.
 * The JSON is serialised with `<`, `>` and `&` escaped as `\u003c`, `\u003e`
 * and `\u0026`, so a value such as `"</script><script>…"` cannot close the
 * tag and run. JSON parsers read the escapes back as the original
 * characters, so the structured data is unchanged for search engines.
 *
 * The presets build the common schema.org objects from the values you pass;
 * none of them carries placeholder data. Validate the output with a rich
 * results tester before relying on it.
 */

const CONTEXT = "https://schema.org" as const;

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export interface JsonLdProps {
  data: object;
  id?: string;
}

export function JsonLd({ data, id }: JsonLdProps) {
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

/** Drops keys whose value is undefined, so optional inputs do not appear as null or "undefined". */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export interface PostalAddressInput {
  street?: string;
  postalCode?: string;
  locality: string;
  region?: string;
  country: string;
}

function postalAddress(a: PostalAddressInput) {
  return compact({
    "@type": "PostalAddress" as const,
    streetAddress: a.street,
    postalCode: a.postalCode,
    addressLocality: a.locality,
    addressRegion: a.region,
    addressCountry: a.country,
  });
}

export interface PersonInput {
  name: string;
  url?: string;
  jobTitle?: string;
  image?: string;
  email?: string;
  sameAs?: string[];
  address?: PostalAddressInput;
  worksFor?: { name: string; url?: string };
}

export function person(p: PersonInput) {
  return compact({
    "@context": CONTEXT,
    "@type": "Person" as const,
    name: p.name,
    url: p.url,
    jobTitle: p.jobTitle,
    image: p.image,
    email: p.email,
    sameAs: p.sameAs,
    address: p.address ? postalAddress(p.address) : undefined,
    worksFor: p.worksFor ? compact({ "@type": "Organization" as const, name: p.worksFor.name, url: p.worksFor.url }) : undefined,
  });
}

export interface OrganizationInput {
  name: string;
  url: string;
  logo?: string;
  email?: string;
  telephone?: string;
  sameAs?: string[];
  address?: PostalAddressInput;
}

export function organization(o: OrganizationInput) {
  return compact({
    "@context": CONTEXT,
    "@type": "Organization" as const,
    name: o.name,
    url: o.url,
    logo: o.logo,
    email: o.email,
    telephone: o.telephone,
    sameAs: o.sameAs,
    address: o.address ? postalAddress(o.address) : undefined,
  });
}

export interface LocalBusinessInput extends Omit<OrganizationInput, "address"> {
  description?: string;
  address: PostalAddressInput;
  geo?: { latitude: number; longitude: number };
  priceRange?: string;
  openingHours?: { days: string[]; opens: string; closes: string };
}

export function localBusiness(b: LocalBusinessInput) {
  return compact({
    "@context": CONTEXT,
    "@type": "LocalBusiness" as const,
    name: b.name,
    description: b.description,
    url: b.url,
    logo: b.logo,
    email: b.email,
    telephone: b.telephone,
    sameAs: b.sameAs,
    address: postalAddress(b.address),
    geo: b.geo ? { "@type": "GeoCoordinates" as const, latitude: b.geo.latitude, longitude: b.geo.longitude } : undefined,
    priceRange: b.priceRange,
    openingHoursSpecification: b.openingHours
      ? {
          "@type": "OpeningHoursSpecification" as const,
          dayOfWeek: b.openingHours.days,
          opens: b.openingHours.opens,
          closes: b.openingHours.closes,
        }
      : undefined,
  });
}

export interface MusicGroupInput {
  name: string;
  url?: string;
  genre?: string[];
  image?: string;
  sameAs?: string[];
}

export function musicGroup(m: MusicGroupInput) {
  return compact({
    "@context": CONTEXT,
    "@type": "MusicGroup" as const,
    name: m.name,
    url: m.url,
    genre: m.genre,
    image: m.image,
    sameAs: m.sameAs,
  });
}
