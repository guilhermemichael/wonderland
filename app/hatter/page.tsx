import { PathScene } from "@/components/paths/PathScene";
import { pathMetadata } from "@/components/paths/pathMetadata";

export const metadata = pathMetadata("hatter");

export default function HatterPage() {
  return <PathScene id="hatter" />;
}
