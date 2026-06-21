import { notFound } from "next/navigation";
import { StandalonePage } from "@/components/service/standalone-page";
import { getPage, pageMetadata } from "@/lib/pages";

const page = getPage("hepatitis-b");

export const metadata = pageMetadata("hepatitis-b");

export default function HepatitisBPage() {
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
