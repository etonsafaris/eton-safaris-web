/** Shared country-page section titles (National Parks, Accommodations, Explore). */
export default function CountrySectionHeading({ children }: { children: string }) {
  return (
    <h2 className="text-center font-serif text-[28px] font-medium italic text-[#343434] md:text-[32px]">
      {children}
    </h2>
  );
}
