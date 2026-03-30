export type TagLike = { id: number } & Record<string, unknown>;

export function computeTagPillDiffs<T extends TagLike>(
  vals: string[],
  prevLocalTags: T[],
  availableTags: T[],
  serverTags: T[],
  tagAdds: number[],
  tagRemoves: number[],
): {
  newLocalTags: T[];
  newTagAdds: number[];
  newTagRemoves: number[];
} {
  const newIds = vals.map((v) => Number(String(v).replace(/^tag:/, "")));
  const prevIds = prevLocalTags.map((t) => t.id);

  const added = newIds.filter((id) => !prevIds.includes(id));
  const removed = prevIds.filter((id) => !newIds.includes(id));

  let newAdds = [...tagAdds];
  let newRemoves = [...tagRemoves];
  let newLocal = [...prevLocalTags];

  added.forEach((id) => {
    if (newRemoves.includes(id)) {
      newRemoves = newRemoves.filter((x) => x !== id);
    } else {
      const existedOnServer = serverTags.some((t) => t.id === id);
      if (!existedOnServer && !newAdds.includes(id)) newAdds.push(id);
      const addedTag = availableTags.find((t) => t.id === id);
      if (addedTag && !newLocal.some((p) => p.id === addedTag.id))
        newLocal.push(addedTag);
    }
  });

  removed.forEach((id) => {
    if (newAdds.includes(id)) {
      newAdds = newAdds.filter((x) => x !== id);
    } else {
      if (!newRemoves.includes(id)) newRemoves.push(id);
    }
    newLocal = newLocal.filter((t) => t.id !== id);
  });

  return {
    newLocalTags: newLocal,
    newTagAdds: newAdds,
    newTagRemoves: newRemoves,
  };
}

export default computeTagPillDiffs;
