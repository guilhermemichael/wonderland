import { PathScene } from "@/components/paths/PathScene";
import { pathMetadata } from "@/components/paths/pathMetadata";

export const metadata = pathMetadata("cheshire");

export default function CheshirePage() {
  return <PathScene id="cheshire" />;
}
