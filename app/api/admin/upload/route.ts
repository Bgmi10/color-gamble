import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { route, json, fail } from "@/lib/auth";
const S = z.object({ filename: z.string().min(1), contentType: z.string().regex(/^image\/(png|jpe?g|webp|gif)$/) });
// Presigned PUT: the browser uploads the banner straight to S3.
export const POST = route({ perm: "settings" }, async (req) => {
  const d = S.parse(await req.json());
  const bucket = process.env.S3_BUCKET, region = process.env.AWS_REGION;
  if (!bucket || !region) return fail("S3 is not configured", 500);
  const key = `assets/${Date.now()}-${d.filename.replace(/[^\w.\-]/g, "_")}`;
  const uploadUrl = await getSignedUrl(new S3Client({ region }), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: d.contentType }), { expiresIn: 300 });
  return json({ uploadUrl, publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}` });
});
