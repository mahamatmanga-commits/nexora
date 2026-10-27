import { NextResponse } from "next/server";
import { campaignInputSchema } from "@/lib/domain/schemas";
import { createCampaign, listCampaigns } from "@/lib/server/repositories/campaigns";
import { errorResponse, readJson } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listCampaigns());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = campaignInputSchema.parse(await readJson(request));
    return NextResponse.json(await createCampaign(input), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
