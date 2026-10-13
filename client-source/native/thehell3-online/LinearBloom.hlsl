// Color conversion adapted from DamnationX 1.6.0-beta.3's embedded WGSL
// hybrid present pass (research/damnationx/shader-fragments/fragment-22.wgsl.inc).
// Uses TH3's palette frame; geometry lighting and HD atlases are not included.
sampler tx : register(s0);
sampler pl : register(s1);
float4 frame : register(c0); // inverse texture dimensions, viewport rows, strength
struct PSInput { float2 sp : VPOS; float2 cr : TEXCOORD0; };
float srgbToLinear1(float c){return c>0.04045?pow((c+0.055)/1.055,2.4):c/12.92;}
float linearToSrgb1(float c){return c>0.0031308?1.055*pow(max(c,0),1.0/2.4)-0.055:c*12.92;}
float3 toLinear(float3 c){return float3(srgbToLinear1(c.r),srgbToLinear1(c.g),srgbToLinear1(c.b));}
float3 toSrgb(float3 c){return float3(linearToSrgb1(c.r),linearToSrgb1(c.g),linearToSrgb1(c.b));}
float3 sampleColor(float2 uv){return tex1D(pl,tex2D(tx,saturate(uv)).r).rgb;}
float3 highlight(float2 uv){float3 c=toLinear(sampleColor(uv));return c*smoothstep(0.45,1.0,max(c.r,max(c.g,c.b)));}
float4 main_bloom(PSInput input) : COLOR {
 float3 base=sampleColor(input.cr);
 if(input.cr.y>=frame.z*frame.y)return float4(base,1);
 float2 d=frame.xy;
 float3 glow=highlight(input.cr)*4;
 glow+=highlight(input.cr+float2(d.x,0))*2;
 glow+=highlight(input.cr-float2(d.x,0))*2;
 glow+=highlight(input.cr+float2(0,d.y))*2;
 glow+=highlight(input.cr-float2(0,d.y))*2;
 glow+=highlight(input.cr+d)+highlight(input.cr-d);
 glow+=highlight(input.cr+float2(d.x,-d.y))+highlight(input.cr+float2(-d.x,d.y));
 return float4(toSrgb(saturate(toLinear(base)+glow*(frame.w/16.0))),1);
}
