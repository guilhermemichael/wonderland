import { RabbitHole } from "../../components/rabbit-hole";
import { Crossroads } from "../../components/crossroads";

export default function RabbitHolePage() {
  return <main className="site-shell"><RabbitHole page="/rabbit-hole" /><div id="crossroads"><Crossroads page="/rabbit-hole" /></div></main>;
}
