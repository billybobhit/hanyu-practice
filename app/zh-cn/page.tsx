import PracticeSetup from "@/components/PracticeSetup";
import PlacementBanner from "@/components/PlacementBanner";

export default function ZhCnPage() {
  return (
    <>
      <PlacementBanner languageCode="zh-cn" />
      <PracticeSetup
        basePath="/zh-cn"
        variantLabel="Simplified Chinese"
        variantNative="简体中文"
      />
    </>
  );
}
