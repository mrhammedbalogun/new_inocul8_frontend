import { notFound } from "next/navigation";
import { StandalonePage } from "@/components/service/standalone-page";
import { getPage, pageMetadata } from "@/lib/pages";

export function generateMetadata() {
  return pageMetadata("hepatitis-b");
}

export default async function HepatitisBPage() {
  const page = await getPage("hepatitis-b");
  if (!page) notFound();
  return (
    <StandalonePage
      page={page}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "What We Do", path: "/what-we-do" },
        { name: page.title, path: page.path },
      ]}
    />
  );
}
