function Swatch() {
  return <div className="bg-[#181a1a] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        Onyx 100
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #181a1a
      </p>
    </div>
  );
}

function SwatchText1() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch />
      <SwatchText />
    </div>
  );
}

function Swatch1() {
  return <div className="bg-[#353839] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText2() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start leading-[0] relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 90`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]">#</span>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          c0c9cc
        </span>
      </p>
    </div>
  );
}

function SwatchText3() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch1 />
      <SwatchText2 />
    </div>
  );
}

function Swatch2() {
  return <div className="bg-[#55595b] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText4() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 80`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #55595b
      </p>
    </div>
  );
}

function SwatchText5() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch2 />
      <SwatchText4 />
    </div>
  );
}

function Swatch3() {
  return <div className="bg-[#777d7f] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText6() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 70`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #777d7f
      </p>
    </div>
  );
}

function SwatchText7() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch3 />
      <SwatchText6 />
    </div>
  );
}

function Swatch4() {
  return <div className="bg-[#9ba2a5] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText8() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 60`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #9ba2a5
      </p>
    </div>
  );
}

function SwatchText9() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch4 />
      <SwatchText8 />
    </div>
  );
}

function Swatch5() {
  return <div className="bg-[#c0c9cc] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText10() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 50`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #c0c9cc
      </p>
    </div>
  );
}

function SwatchText11() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch5 />
      <SwatchText10 />
    </div>
  );
}

function Swatch6() {
  return <div className="bg-[#eef0f1] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText12() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 40`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #eef0f1
      </p>
    </div>
  );
}

function SwatchText13() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch6 />
      <SwatchText12 />
    </div>
  );
}

function Swatch7() {
  return <div className="bg-[#f3f4f5] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText14() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 30`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #F3F4F5
      </p>
    </div>
  );
}

function SwatchText15() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch7 />
      <SwatchText14 />
    </div>
  );
}

function Swatch8() {
  return <div className="bg-[#f5f6f7] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText16() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 20`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #D7D8D9
      </p>
    </div>
  );
}

function SwatchText17() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch8 />
      <SwatchText16 />
    </div>
  );
}

function Swatch9() {
  return <div className="bg-[#f5f6f7] h-[160px] rounded-[32px] shrink-0 w-[110px]" data-name="Swatch" />;
}

function SwatchText18() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 text-[#55595b] text-[18px] w-[110px]" data-name="Swatch Text">
      <p className="css-4hzbpn font-['Roboto:Bold',sans-serif] font-bold leading-[0] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        <span className="leading-[normal]" style={{ fontVariationSettings: "'wdth' 100" }}>
          Onyx
        </span>
        <span className="leading-[normal]">{` 10`}</span>
      </p>
      <p className="css-4hzbpn font-['Roboto:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 w-full" style={{ fontVariationSettings: "'wdth' 100" }}>
        #f3f3f4
      </p>
    </div>
  );
}

function SwatchText19() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Swatch + Text">
      <Swatch9 />
      <SwatchText18 />
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="Frame">
      <SwatchText1 />
      <SwatchText3 />
      <SwatchText5 />
      <SwatchText7 />
      <SwatchText9 />
      <SwatchText11 />
      <SwatchText13 />
      <SwatchText15 />
      <SwatchText17 />
      <SwatchText19 />
    </div>
  );
}

export default function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative size-full" data-name="Frame">
      <p className="css-ew64yg font-['Roboto:Bold',sans-serif] font-bold leading-none relative shrink-0 text-[#181a1a] text-[36px] text-right" style={{ fontVariationSettings: "'wdth' 100" }}>
        Stoic Onyx
      </p>
      <Frame />
    </div>
  );
}