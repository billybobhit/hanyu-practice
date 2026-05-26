import PlacementBanner from "@/components/PlacementBanner";

export default function ZhTwLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlacementBanner languageCode="zh-tw" />
      {children}
    </>
  );
}
