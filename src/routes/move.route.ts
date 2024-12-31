import { Router } from "express";
import { prisma } from "../../prisma";
import { Bundle, soldBundle } from "@prisma/client";

const moveRouter = Router();

function parseRange(range: string):
  | {
      isValid: false;
      message: string;
      numbers?: undefined;
    }
  | {
      isValid: true;
      numbers: string[];
      message?: undefined;
    } {
  
      const result = range.split(",");

  return { isValid: true, numbers: result };
}


moveRouter.post("/move", async (req, res) => {
  console.clear();
  const moveData: string = req.body.moveData;
  const ref: string = req.body.ref;
  let errored: string[] = [];

  const { isValid, message, numbers } = parseRange(moveData);
    if (!isValid) {
      res.json({ done: false, message });
    } else {
      const promises = numbers.map(async (n) => {
        try {
          const bundleCheck = await prisma.soldBundle.findUnique({
            where: {
              sr_no: n,
            },
          });

          if (bundleCheck == null) {
            let foundBundle = await prisma.bundle.findUnique({
              where: {
                sr_no: n,
              },
            });

            let movedBundle: Bundle;
            if (foundBundle !== null) {
              foundBundle.status = "SOLD";

              movedBundle = await prisma.soldBundle.create({
                data: {
                  reference: ref,
                  ...foundBundle,
                },
              });
              console.log("MOVED TO SOLD: " + movedBundle.sr_no);

              if (movedBundle !== undefined || movedBundle !== null) {
                const delBundle = await prisma.bundle.delete({
                  where: {
                    uid: movedBundle.uid,
                  },
                });

                console.log("DELETED FROM BUNDLES: " + delBundle.sr_no);
              }
            }
          } else {
            const oBundleCheck = await prisma.bundle.findUnique({
              where: {
                sr_no: bundleCheck.sr_no,
              },
            });

            if (oBundleCheck === null) {
              console.log("BUNDLE ALREADY MOVED TO SOLD: " + bundleCheck.sr_no);
            } else {
              const delBundle = await prisma.bundle.delete({
                where: {
                  uid: oBundleCheck.uid,
                },
              });
              console.log(
                "BUNDLE ALREADY MOVED TO SOLD [DELETE GHOST]: " +
                  delBundle.sr_no
              );
            }
          }
        } catch (err) {
          errored.push(n)
        }
      });

      Promise.all(promises).then(() => {
        console.log(`Total errored bundles: ${errored.length}`)
        console.log(errored)
      })
      res.json({ done: true });
    }

 
});

export { moveRouter };
