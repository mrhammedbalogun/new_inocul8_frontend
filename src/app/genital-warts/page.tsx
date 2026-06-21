import { notFound } from "next/navigation";
import { StandalonePage } from "@/components/service/standalone-page";
import { getPage, pageMetadata } from "@/lib/pages";

const page = getPage("genital-warts");

export const metadata = pageMetadata("genital-warts");

export default function GenitalWartsPage() {
  if (!page) notFound();
  return (
    <StandalonePage
      page={page}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "What We Do", path: "/what-we-do" },
        { name: "myHealth", path: "/what-we-do/myhealth-services" },
        { name: page.title, path: page.path },
      ]}
    />
  );
}
