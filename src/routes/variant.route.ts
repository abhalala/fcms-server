import { Router } from "express";
import { prisma } from "../../prisma";

const variantRouter = Router();

// variantRouter.get("/:sid", async (req, res) => {
//   const sid = req.params.sid;
//   await prisma.variant
//     .findUnique({
//       where: {
//         s_no: sid,
//       },
//     })
//     .then(
//       (variant) => {
//         res.json(variant);
//       },
//       (reject) => {
//         res.json({ rejection: reject });
//       }
//     )
//     .catch((err) => {
//       res.json({ err });
//     });
// });

variantRouter.get("/all", async (req, res) => {
  const variants = await prisma.variant.findMany({
    select: {
      s_no: true,
	  series: true,
	  range: true,
    },
  });
  res.send({ variants: variants });
});

export { variantRouter };
