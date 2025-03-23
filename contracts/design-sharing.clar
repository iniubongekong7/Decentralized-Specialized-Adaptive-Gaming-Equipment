;; Design Sharing Contract
;; Facilitates exchange of successful adaptations

;; Data Variables
(define-data-var design-counter uint u0)

;; Data Maps
(define-map designs
  { design-id: uint }
  {
    creator: principal,
    device-id: uint,
    title: (string-utf8 100),
    description: (string-utf8 500),
    files-hash: (buff 32),
    license-type: (string-utf8 50),
    materials: (list 10 (string-utf8 50)),
    tools-required: (list 10 (string-utf8 50)),
    difficulty-level: uint,
    timestamp: uint
  }
)

(define-map device-designs
  { device-id: uint }
  { design-ids: (list 100 uint) }
)

(define-map creator-designs
  { creator: principal }
  { design-ids: (list 100 uint) }
)

(define-map design-ratings
  { design-id: uint, rater: principal }
  { rating: uint, comment: (string-utf8 200) }
)

(define-map design-average-ratings
  { design-id: uint }
  { total-rating: uint, count: uint }
)

;; Share a new design
(define-public (share-design
    (device-id uint)
    (title (string-utf8 100))
    (description (string-utf8 500))
    (files-hash (buff 32))
    (license-type (string-utf8 50))
    (materials (list 10 (string-utf8 50)))
    (tools-required (list 10 (string-utf8 50)))
    (difficulty-level uint))
  (let ((design-id (var-get design-counter)))
    (begin
      ;; Store the design information
      (map-set designs
        { design-id: design-id }
        {
          creator: tx-sender,
          device-id: device-id,
          title: title,
          description: description,
          files-hash: files-hash,
          license-type: license-type,
          materials: materials,
          tools-required: tools-required,
          difficulty-level: difficulty-level,
          timestamp: block-height
        }
      )

      ;; Update device-to-design mapping
      (let ((device-list (default-to { design-ids: (list) } (map-get? device-designs { device-id: device-id }))))
        (map-set device-designs
          { device-id: device-id }
          { design-ids: (unwrap-panic (as-max-len? (append (get design-ids device-list) design-id) u100)) }
        )
      )

      ;; Update creator-to-design mapping
      (let ((creator-list (default-to { design-ids: (list) } (map-get? creator-designs { creator: tx-sender }))))
        (map-set creator-designs
          { creator: tx-sender }
          { design-ids: (unwrap-panic (as-max-len? (append (get design-ids creator-list) design-id) u100)) }
        )
      )

      ;; Initialize rating
      (map-set design-average-ratings
        { design-id: design-id }
        { total-rating: u0, count: u0 }
      )

      ;; Increment counter and return design ID
      (var-set design-counter (+ design-id u1))
      (ok design-id)
    )
  )
)

;; Rate a design
(define-public (rate-design
    (design-id uint)
    (rating uint)
    (comment (string-utf8 200)))
  (let ((design-data (map-get? designs { design-id: design-id }))
        (current-rating (map-get? design-ratings { design-id: design-id, rater: tx-sender }))
        (average-rating (default-to { total-rating: u0, count: u0 }
                         (map-get? design-average-ratings { design-id: design-id }))))
    (if (and (is-some design-data) (<= rating u5))
      (begin
        ;; Store the rating
        (map-set design-ratings
          { design-id: design-id, rater: tx-sender }
          { rating: rating, comment: comment }
        )

        ;; Update average rating
        (if (is-some current-rating)
          ;; Update existing rating
          (map-set design-average-ratings
            { design-id: design-id }
            {
              total-rating: (+ (- (get total-rating average-rating) (get rating (unwrap-panic current-rating))) rating),
              count: (get count average-rating)
            }
          )
          ;; Add new rating
          (map-set design-average-ratings
            { design-id: design-id }
            {
              total-rating: (+ (get total-rating average-rating) rating),
              count: (+ (get count average-rating) u1)
            }
          )
        )

        (ok true)
      )
      (err u1) ;; Simple error code
    )
  )
)

;; Get design details by ID
(define-read-only (get-design (design-id uint))
  (map-get? designs { design-id: design-id })
)

;; Get all designs for a device
(define-read-only (get-designs-by-device (device-id uint))
  (default-to { design-ids: (list) } (map-get? device-designs { device-id: device-id }))
)

;; Get all designs by a creator
(define-read-only (get-creator-designs (creator principal))
  (default-to { design-ids: (list) } (map-get? creator-designs { creator: creator }))
)

;; Get a specific rating
(define-read-only (get-design-rating (design-id uint) (rater principal))
  (map-get? design-ratings { design-id: design-id, rater: rater })
)

;; Get average rating for a design
(define-read-only (get-design-average-rating (design-id uint))
  (let ((rating-data (map-get? design-average-ratings { design-id: design-id })))
    (if (and (is-some rating-data) (> (get count (unwrap-panic rating-data)) u0))
      (some (/ (get total-rating (unwrap-panic rating-data)) (get count (unwrap-panic rating-data))))
      none
    )
  )
)

;; Get the total number of shared designs
(define-read-only (get-design-count)
  (var-get design-counter)
)

