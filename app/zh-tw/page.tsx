import PracticeSetup from "@/components/PracticeSetup";
import PlacementBanner from "@/components/PlacementBanner";

export default function ZhTwPage() {
  return (
    <>
      <PlacementBanner languageCode="zh-tw" />
      <PracticeSetup
        basePath="/zh-tw"
        variantLabel="Traditional Chinese"
        variantNative="繁體中文"
      />
    </>
  );
}
