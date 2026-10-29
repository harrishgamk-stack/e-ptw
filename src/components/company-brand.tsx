import Image from "next/image";

export function CompanyBrand() {
  return (
    <span className="company-brand">
      <span className="company-logo">
        <Image
          src="/brand/pcg-logo.png"
          alt="Premier Centre Group"
          width={1000}
          height={370}
          sizes="(max-width: 600px) 116px, 164px"
          preload
        />
      </span>
      <span className="company-product">
        ePTW<small>PERMIT TO WORK</small>
      </span>
    </span>
  );
}
