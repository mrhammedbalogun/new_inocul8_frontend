/**
 * The one place that decides how a person's name + credentials read as a single
 * visible byline.
 *
 * Normally "Name, LETTERS" — but NOT when the name already carries an honorific
 * ("Dr Egbroko Emmanuel"), where appending the letters reads as a doubled title.
 *
 * IMPORTANT — this is a DISPLAY rule and nothing more. `Author.credentials` must
 * stay populated in the database: the backend treats a non-empty value as one of
 * the two keys authorising a medical-review stamp (`Author.can_medically_review`
 * = is_clinician AND credentials, apps/blog/models.py — consumed by
 * apps/blog/studio/workflow.py on publish). Blanking the field to fix a byline
 * would silently revoke that clinician's review authority on every future
 * publish. JSON-LD likewise keeps emitting the credential, as the structured
 * `honorificSuffix` field where it belongs (src/lib/schema.ts).
 */

// "Dr"/"Dr."/"Prof"/"Professor", followed by a boundary so "Drake" is not a title.
const HONORIFIC_RE = /^(dr|drs|prof|professor)\b\.?/i;

export function byline(
  person: { name: string; credentials?: string | null } | null | undefined,
): string {
  if (!person) return "";
  const name = person.name.trim();
  const credentials = (person.credentials ?? "").trim();
  if (!credentials || HONORIFIC_RE.test(name)) return name;
  return `${name}, ${credentials}`;
}
