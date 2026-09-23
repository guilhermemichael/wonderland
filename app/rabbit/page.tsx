import { PathScene } from "@/components/paths/PathScene";
import { pathMetadata } from "@/components/paths/pathMetadata";

export const metadata = pathMetadata("rabbit");

export default function RabbitPage() {
  return <PathScene id="rabbit" />;
}
