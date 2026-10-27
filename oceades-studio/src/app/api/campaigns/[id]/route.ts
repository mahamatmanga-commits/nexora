import { NextResponse } from "next/server";
import { campaignPatchSchema } from "@/lib/domain/schemas";
import { deleteCampaign, getCampaign, updateCampaign } from "@/lib/server/repositories/campaigns";
import { errorResponse, readJson } from "@/lib/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    return NextResponse.json(await getCampaign((await params).id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const patch = campaignPatchSchema.parse(await readJson(request));
    return NextResponse.json(await updateCampaign((await params).id, patch));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await deleteCampaign((await params).id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
