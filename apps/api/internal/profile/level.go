package profile

import (
	"encoding/json"
	"fmt"
)

// MaxLevel is the highest Level (migration 000021 checks level and level_seen BETWEEN 0 AND 5).
const MaxLevel = 5

// ParseLevelFields checks the Level keys of a profile save: a request that sends level is refused (an admin or a coach
// sets it, never the user), and levelSeen must be a whole number from 0 to 5. It returns the levelSeen to write, nil
// when the save leaves it out. One above the user's level is stored as the level (the upsert's LEAST), not refused.
func ParseLevelFields(req UpsertProfileRequest) (*int, FieldErrors) {
	if req.Level.Set {
		return nil, FieldErrors{"level": "level is set by your coach"}
	}
	if !req.LevelSeen.Set {
		return nil, nil
	}
	var seen int
	if req.LevelSeen.Raw == nil || json.Unmarshal(req.LevelSeen.Raw, &seen) != nil || seen < 0 || seen > MaxLevel {
		return nil, FieldErrors{"levelSeen": fmt.Sprintf("levelSeen must be a whole number from 0 to %d", MaxLevel)}
	}
	return &seen, nil
}
