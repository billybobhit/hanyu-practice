import PlacementBanner from "@/components/PlacementBanner";

export default function ZhCnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlacementBanner languageCode="zh-cn" />
      {children}
    </>
  );
}
